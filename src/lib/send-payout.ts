"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, type Address, type Hash } from "viem";
import { useConfig, type Config } from "wagmi";
import {
  getConnection,
  readContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";

import { toApiError } from "@/lib/api/client";
import { payoutsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/queries";
import type { Payout, PayoutBatch } from "@/lib/api/types";
import { BATCHER_ADDRESS, chain, USDC } from "@/lib/config";
import { erc20Abi, payBatcherAbi } from "@/lib/contracts";
import { formatToken } from "@/lib/format";

/**
 * The send flow, step by step:
 *   prepare  -> backend locks the payout and splits it into batches (refs + recipients + amounts)
 *   approve  -> one USDC approval to the batcher for everything still to send
 *   send     -> one batchTransfer per batch; each hash is reported to the backend straight away
 *   confirm  -> the backend's indexer marks batches confirmed; usePayout polls until it does
 */
export type SendStep = "idle" | "switching" | "preparing" | "checking" | "approving" | "sending" | "done" | "error";

export type SendState = {
  step: SendStep;
  /** Which batch (0-based index into the ready batches) is being signed or mined. */
  batchIndex: number;
  batchTotal: number;
  /** Waiting for the wallet to sign, vs waiting for the chain to include it. */
  phase: "sign" | "mine" | null;
  approveHash: Hash | null;
  error: string | null;
};

const initial: SendState = {
  step: "idle",
  batchIndex: 0,
  batchTotal: 0,
  phase: null,
  approveHash: null,
  error: null,
};

// Keyed by payout id. In a Jotai atom (not component state) so a send keeps
// reporting progress if the user navigates away and comes back mid-flow.
const sendStatesAtom = atom<Record<string, SendState>>({});

export function useSendState(payoutId: string) {
  const all = useAtomValue(sendStatesAtom);
  return all[payoutId] ?? initial;
}

/** Human message for wallet / chain / API errors. */
export function describeError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return "You declined the request in your wallet. Nothing was sent.";
    }
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const reason = revert.reason ?? revert.data?.errorName ?? "";
      if (/allowance/i.test(reason)) return "The USDC approval is too low for this batch. Try again to re-approve.";
      if (/balance/i.test(reason)) return "This wallet doesn't have enough USDC for this batch.";
      if (/Reference already used/i.test(reason)) return "This batch was already sent from this wallet.";
      return reason ? `The contract rejected this batch: ${reason}` : "The contract rejected this batch.";
    }
    if (/insufficient funds/i.test(error.message)) {
      return `This wallet needs a little ETH on ${chain.name} to pay network fees.`;
    }
    if (/rejected|denied/i.test(error.message)) {
      return "You declined the request in your wallet. Nothing was sent.";
    }
    return error.shortMessage || error.message.split("\n")[0];
  }
  return toApiError(error).message;
}

const readyBatches = (p: Payout) =>
  p.batches.filter((b) => b.status === "ready").sort((a, b) => a.batch_index - b.batch_index);

const sum = (batches: PayoutBatch[]) => batches.reduce((acc, b) => acc + BigInt(b.total_amount), BigInt(0));

async function run(
  payoutId: string,
  config: Config,
  qc: QueryClient,
  update: (patch: Partial<SendState>) => void,
) {
  const connection = getConnection(config);
  const sender = connection.address;
  if (!sender) throw new Error("Connect a wallet first.");

  if (connection.chainId !== chain.id) {
    update({ step: "switching" });
    await switchChain(config, { chainId: chain.id });
  }

  // 1. Prepare (idempotent for the same wallet: same batches, same refs).
  update({ step: "preparing" });
  let payout = await payoutsApi.prepare(payoutId, sender);
  qc.setQueryData(qk.payout(payoutId), payout);

  const batches = readyBatches(payout);
  if (!batches.length) {
    update({ step: "done", batchTotal: 0 });
    return;
  }
  update({ batchTotal: batches.length });

  // 2. Balance + allowance for everything still to send.
  update({ step: "checking" });
  const needed = sum(batches);
  const [balance, allowance] = await Promise.all([
    readContract(config, { address: USDC.address, abi: erc20Abi, functionName: "balanceOf", args: [sender], chainId: chain.id }),
    readContract(config, { address: USDC.address, abi: erc20Abi, functionName: "allowance", args: [sender, BATCHER_ADDRESS], chainId: chain.id }),
  ]);
  if (balance < needed) {
    throw new Error(
      `This wallet has ${formatToken(balance)} but this payment needs ${formatToken(needed)}. Add USDC and try again.`,
    );
  }

  if (allowance < needed) {
    update({ step: "approving", phase: "sign" });
    // Exactly what's needed, not unlimited: the batcher only ever gets what this payment sends.
    const hash = await writeContract(config, {
      address: USDC.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [BATCHER_ADDRESS, needed],
      chainId: chain.id,
    });
    update({ phase: "mine", approveHash: hash });
    const receipt = await waitForTransactionReceipt(config, { hash, chainId: chain.id });
    if (receipt.status !== "success") throw new Error("The USDC approval failed on-chain. Try again.");
  }

  // 3. One batchTransfer per batch, in order.
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    update({ step: "sending", batchIndex: i, phase: "sign" });

    // Sent before (e.g. a closed tab after signing): the contract would revert, and the indexer will match it.
    const used = await readContract(config, {
      address: BATCHER_ADDRESS,
      abi: payBatcherAbi,
      functionName: "usedRefs",
      args: [sender, batch.ref],
      chainId: chain.id,
    });
    if (used) continue;

    if (!batch.recipients || !batch.amounts) throw new Error("This batch is missing its recipients. Reload and try again.");

    const hash = await writeContract(config, {
      address: BATCHER_ADDRESS,
      abi: payBatcherAbi,
      functionName: "batchTransfer",
      args: [batch.ref, USDC.address, batch.recipients as Address[], batch.amounts.map((a) => BigInt(a))],
      chainId: chain.id,
    });

    // Report the hash before waiting: if the tab closes now, the backend still knows.
    payout = await submitWithRetry(payoutId, batch.id, hash);
    qc.setQueryData(qk.payout(payoutId), payout);

    update({ phase: "mine" });
    const receipt = await waitForTransactionReceipt(config, { hash, chainId: chain.id });
    if (receipt.status !== "success") {
      throw new Error(`Batch ${i + 1} failed on-chain. Nothing in it was paid. You can try it again in a minute.`);
    }
  }

  update({ step: "done", phase: null });
  qc.invalidateQueries({ queryKey: qk.payout(payoutId) });
  qc.invalidateQueries({ queryKey: qk.historyRoot });
  qc.invalidateQueries({ queryKey: ["me", "stats"] });
}

/** The money already moved; a flaky network must not lose the hash. */
async function submitWithRetry(payoutId: string, batchId: string, hash: Hash, attempts = 4): Promise<Payout> {
  for (let i = 0; ; i++) {
    try {
      return await payoutsApi.submitBatch(payoutId, batchId, hash);
    } catch (e) {
      const err = toApiError(e);
      const transient = err.isNetwork || err.status >= 500 || err.status === 429;
      if (!transient || i >= attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

export function useSendPayout(payoutId: string) {
  const config = useConfig();
  const qc = useQueryClient();
  const setAll = useSetAtom(sendStatesAtom);
  const state = useSendState(payoutId);

  const update = useCallback(
    (patch: Partial<SendState>) =>
      setAll((all) => ({ ...all, [payoutId]: { ...(all[payoutId] ?? initial), ...patch } })),
    [payoutId, setAll],
  );

  const busy = !["idle", "done", "error"].includes(state.step);

  const start = useCallback(async () => {
    update({ ...initial, step: "preparing" });
    try {
      await run(payoutId, config, qc, update);
    } catch (e) {
      update({ step: "error", phase: null, error: describeError(e) });
      // Whatever happened, show the backend's view of the batches.
      qc.invalidateQueries({ queryKey: qk.payout(payoutId) });
    }
  }, [config, payoutId, qc, update]);

  const reset = useCallback(() => update(initial), [update]);

  return { state, start, reset, busy };
}
