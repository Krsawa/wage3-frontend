"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useBalance, useConnection, useSwitchChain } from "wagmi";

import { usePaymentsPaused } from "@/components/shell/status-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { InfoTip } from "@/components/ui/tooltip";
import { ConnectDialog } from "@/components/wallet/connect-dialog";
import { useUsdcBalance } from "@/components/wallet/wallet-button";
import { CheckIcon, ExternalIcon, LockIcon, PaperPlaneIcon, ShieldCheckIcon } from "@/components/ui/icons";
import type { Payout } from "@/lib/api/types";
import { chain, LIMITS, txUrl, USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { formatAmount, parseAmount, pluralize, shortAddress } from "@/lib/format";
import { NO_GAS_MESSAGE, type SendState } from "@/lib/send-payout";
import { DISPLAY_FIGURE } from "@/lib/type";

type StepStatus = "todo" | "active" | "done" | "error";

/**
 * Right-hand card on a payment: what's being sent, and the button + stepper that sends it.
 * `total`/`count` come from local rows while drafting, from the payout once it's locked.
 */
export function SendCard({
  payout,
  total,
  count,
  state,
  onSend,
  onRetry,
  disabledReason,
  sendLabel = "Send payment",
  requireTypedTotal = false,
}: {
  payout: Payout;
  total: bigint;
  count: number;
  state: SendState;
  onSend: () => void;
  onRetry: () => void;
  /** e.g. "Fix 2 rows first". Shown under the button. */
  disabledReason?: string | null;
  sendLabel?: string;
  /** Large payment: the sender types the total before the button unlocks. */
  requireTypedTotal?: boolean;
}) {
  const { address, isConnected, chainId } = useConnection();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { paused, message: pausedMessage } = usePaymentsPaused();
  const balance = useUsdcBalance();
  const eth = useBalance({ address, chainId: chain.id, query: { enabled: !!address, refetchInterval: 15_000 } });
  const [connectOpen, setConnectOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const remaining = payout.batches.filter((b) => b.status === "ready");
  const remainingTotal = payout.status === "draft" ? total : remaining.reduce((a, b) => a + BigInt(b.total_amount), BigInt(0));
  const batchCount = payout.status === "draft" ? Math.max(1, Math.ceil(count / LIMITS.batchSize)) : payout.batch_count;
  const signatures = (payout.status === "draft" ? batchCount : remaining.length) + 1; // + approval, at most

  const wrongWallet =
    !!payout.sender_address && !!address && payout.sender_address.toLowerCase() !== address.toLowerCase();
  const wrongChain = isConnected && chainId !== chain.id;
  const short = balance.data !== undefined && balance.data < remainingTotal;
  const noGas = eth.data !== undefined && eth.data.value === BigInt(0);
  const busy = !["idle", "done", "error"].includes(state.step);
  const started = state.step !== "idle";
  const needsTyping = requireTypedTotal && payout.status === "draft" && !started;
  const typedAmount = parseAmount(typed);
  const typedOk = typedAmount.ok && BigInt(typedAmount.value) === remainingTotal;
  const blockedReason =
    disabledReason ?? (short ? `Not enough ${USDC.symbol} in this wallet.` : noGas ? NO_GAS_MESSAGE : null);

  const steps: { key: string; label: ReactNode; detail?: ReactNode; status: StepStatus; icon: ReactNode }[] = [
    {
      key: "lock",
      label: "Lock payment",
      detail: "Amounts can't change after this",
      icon: <LockIcon className="size-3.5" />,
      status:
        state.step === "preparing" || state.step === "switching"
          ? "active"
          : payout.status !== "draft"
            ? "done"
            : state.step === "error" && payout.status === "draft"
              ? "error"
              : "todo",
    },
    {
      key: "approve",
      label: `Confirm ${USDC.symbol}`,
      detail:
        state.step === "approving"
          ? state.phase === "sign"
            ? "Confirm in your wallet"
            : "Waiting for Base…"
          : `Lets the batcher move exactly ${formatAmount(remainingTotal)} ${USDC.symbol}`,
      icon: <ShieldCheckIcon className="size-3.5" />,
      status:
        state.step === "checking" || state.step === "approving"
          ? "active"
          : state.step === "sending" || state.step === "done"
            ? "done"
            : "todo",
    },
    {
      key: "send",
      label:
        state.batchTotal > 1 && state.step === "sending"
          ? `Send batch ${state.batchIndex + 1} of ${state.batchTotal}`
          : batchCount > 1
            ? `Send ${batchCount} batches`
            : "Send",
      detail:
        state.step === "sending"
          ? state.phase === "sign"
            ? "Confirm in your wallet"
            : "Waiting for Base…"
          : batchCount > 1
            ? `Up to ${LIMITS.batchSize} people per transaction`
            : "One transaction for everyone",
      icon: <PaperPlaneIcon className="size-3.5" />,
      status:
        state.step === "sending"
          ? "active"
          : state.step === "done"
            ? "done"
            : state.step === "error" && payout.status !== "draft"
              ? "error"
              : "todo",
    },
  ];

  let action: ReactNode;
  if (paused) {
    action = <Notice tone="warning">{pausedMessage ?? "Payments are paused right now."}</Notice>;
  } else if (!isConnected) {
    action = (
      <>
        <Button size="lg" className="w-full" onClick={() => setConnectOpen(true)}>
          Connect wallet to send
        </Button>
        <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </>
    );
  } else if (wrongChain) {
    action = (
      <Button size="lg" variant="inverse" className="w-full" loading={switching} onClick={() => switchChain({ chainId: chain.id })}>
        Switch to {chain.name}
      </Button>
    );
  } else if (wrongWallet) {
    action = (
      <Notice tone="warning">
        This payment is locked to <span className="font-mono">{shortAddress(payout.sender_address)}</span>. Switch to
        that wallet to keep sending.
      </Notice>
    );
  } else {
    action = (
      <>
        {needsTyping && (
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-muted">
            <span className="text-pretty">
              This is larger than you usually send. Type <span className="font-medium text-fg tabular">{formatAmount(remainingTotal)}</span> to confirm.
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              placeholder={formatAmount(remainingTotal)}
              aria-label="Type the total to confirm"
              className="h-10 rounded-lg border border-border bg-surface px-3 font-mono text-sm text-fg tabular outline-none focus:border-primary"
            />
          </label>
        )}
        <Button
          size="lg"
          className="w-full"
          onClick={state.step === "error" ? onRetry : onSend}
          loading={busy}
          disabled={!!blockedReason || count === 0 || (needsTyping && !typedOk)}
        >
          {state.step === "error" ? "Try again" : started && payout.status !== "draft" ? "Continue sending" : sendLabel}
        </Button>
        {blockedReason && <p className="text-center text-[13px] text-fg-muted text-pretty">{blockedReason}</p>}
      </>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="text-[13px] font-medium text-fg-muted">{payout.status === "draft" ? "You're sending" : "Left to send"}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={cn(DISPLAY_FIGURE, "text-[24px]")}>{formatAmount(remainingTotal)}</span>
          <span className="text-sm text-fg-muted">{USDC.symbol}</span>
        </div>
        {/* Same rows as the New payment summary: label left, value right. */}
        <dl className="mt-5 flex flex-col gap-2.5 text-[13px]">
          <Meta label="Recipients">{pluralize(count, "person", "people")}</Meta>
          <Meta label="Wallet prompts" info={<WalletPromptsInfo />}>Up to {signatures}</Meta>
          <Meta label="Network">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-base-blue" />
              {chain.name}
            </span>
          </Meta>
          {/* Only once there's a wallet to read: a bare dash beside the label says nothing. */}
          {isConnected && (
            <Meta label="Your balance">
              {balance.isLoading ? (
                <span className="text-fg-subtle">…</span>
              ) : (
                <span className={cn("tabular", short && "text-danger-fg")}>
                  {formatAmount(balance.data ?? BigInt(0))} {USDC.symbol}
                </span>
              )}
            </Meta>
          )}
        </dl>
      </div>

      <ol className="px-5 pb-5">
        {steps.map(({ key, ...s }, i) => (
          <Step key={key} {...s} last={i === steps.length - 1} />
        ))}
      </ol>

      <div className="flex flex-col gap-4 bg-surface-sunken p-5">
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {state.step === "error" && state.error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Notice tone="danger">{state.error}</Notice>
              </motion.div>
            )}
          </AnimatePresence>
          {action}
          {state.approveHash && (
            <a
              href={txUrl(state.approveHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1 text-xs text-fg-subtle hover:text-fg"
            >
              Approval transaction <ExternalIcon className="size-3" />
            </a>
          )}
        </div>
        {/* Set apart from the action, centred like the note on New payment. */}
        <p className="text-center text-xs text-balance text-fg-subtle">
          Wage3 never holds your funds. {USDC.symbol} goes straight from your wallet to each person.
        </p>
      </div>
    </Card>
  );
}

function Meta({ label, info, children }: { label: string; info?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1 text-fg-subtle">
        {label}
        {info && <InfoTip label={label} align="start">{info}</InfoTip>}
      </dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function Step({ label, detail, status, icon, last }: { label: ReactNode; detail?: ReactNode; status: StepStatus; icon: ReactNode; last: boolean }) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && (
        <span
          className={cn(
            "absolute top-7 bottom-1 left-[13px] w-px transition-colors duration-300",
            status === "done" ? "bg-success" : "bg-border",
          )}
        />
      )}
      {/* Just the glyph, coloured by state; no circle around it. */}
      <span
        className={cn(
          "relative grid size-7 shrink-0 place-items-center transition-colors duration-200 [&_svg]:size-4",
          status === "done" && "text-success",
          status === "active" && "text-primary",
          status === "error" && "text-danger-fg",
          status === "todo" && "text-fg-subtle",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={status}
            initial={{ opacity: 0, transform: "scale(0.6)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={{ opacity: 0, transform: "scale(0.6)" }}
            transition={{ duration: 0.16 }}
            className="grid place-items-center"
          >
            {status === "done" ? (
              <CheckIcon className="size-4" strokeWidth={2.5} />
            ) : status === "active" ? (
              <Spinner className="size-3.5" />
            ) : status === "error" ? (
              <AlertTriangle className="size-3.5" />
            ) : (
              icon
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <div className="min-w-0 pt-0.5">
        <div className={cn("text-sm font-medium", status === "todo" && "text-fg-muted")}>{label}</div>
        {detail && <div className="mt-0.5 text-[13px] text-fg-subtle">{detail}</div>}
      </div>
    </li>
  );
}

function Notice({ tone, children }: { tone: "warning" | "danger"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px] text-pretty",
        tone === "warning" ? "bg-warning-soft text-warning-fg" : "bg-danger-soft text-danger-fg",
      )}
    >
      <AlertTriangle className="mt-px size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** What "Wallet prompts" counts. Shared with the New payment summary. */
export function WalletPromptsInfo() {
  return (
    <>
      One to confirm the exact {USDC.symbol} total, then one per transaction of up to {LIMITS.batchSize} people. Your
      wallet asks you to approve each.
    </>
  );
}
