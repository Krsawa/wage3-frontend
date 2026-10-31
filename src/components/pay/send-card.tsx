"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, ExternalLink, Lock, PenLine, Send, ShieldCheck, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useConnection, useSwitchChain } from "wagmi";

import { usePaymentsPaused } from "@/components/shell/status-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ConnectDialog } from "@/components/wallet/connect-dialog";
import { useUsdcBalance } from "@/components/wallet/wallet-button";
import type { Payout } from "@/lib/api/types";
import { chain, LIMITS, txUrl, USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { formatAmount, pluralize, shortAddress } from "@/lib/format";
import type { SendState } from "@/lib/send-payout";

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
}) {
  const { address, isConnected, chainId } = useConnection();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { paused, message: pausedMessage } = usePaymentsPaused();
  const balance = useUsdcBalance();
  const [connectOpen, setConnectOpen] = useState(false);

  const remaining = payout.batches.filter((b) => b.status === "ready");
  const remainingTotal = payout.status === "draft" ? total : remaining.reduce((a, b) => a + BigInt(b.total_amount), BigInt(0));
  const batchCount = payout.status === "draft" ? Math.max(1, Math.ceil(count / LIMITS.batchSize)) : payout.batch_count;
  const signatures = (payout.status === "draft" ? batchCount : remaining.length) + 1; // + approval, at most

  const wrongWallet =
    !!payout.sender_address && !!address && payout.sender_address.toLowerCase() !== address.toLowerCase();
  const wrongChain = isConnected && chainId !== chain.id;
  const short = balance.data !== undefined && balance.data < remainingTotal;
  const busy = !["idle", "done", "error"].includes(state.step);
  const started = state.step !== "idle";

  const steps: { key: string; label: ReactNode; detail?: ReactNode; status: StepStatus; icon: ReactNode }[] = [
    {
      key: "lock",
      label: "Lock payment",
      detail: "Amounts can't change after this",
      icon: <Lock className="size-3.5" />,
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
      label: `Approve ${USDC.symbol}`,
      detail:
        state.step === "approving"
          ? state.phase === "sign"
            ? "Confirm in your wallet"
            : "Waiting for Base…"
          : `Lets the batcher move exactly ${formatAmount(remainingTotal)} ${USDC.symbol}`,
      icon: <ShieldCheck className="size-3.5" />,
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
      icon: <Send className="size-3.5" />,
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
          <Wallet className="size-4.5" /> Connect wallet to send
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
        <Button
          size="lg"
          className="w-full"
          onClick={state.step === "error" ? onRetry : onSend}
          loading={busy}
          disabled={!!disabledReason || short || count === 0}
        >
          {state.step === "error" ? "Try again" : started && payout.status !== "draft" ? "Continue sending" : sendLabel}
        </Button>
        {(disabledReason || short) && (
          <p className="text-center text-[13px] text-fg-muted">
            {disabledReason ?? `Not enough ${USDC.symbol} in this wallet.`}
          </p>
        )}
      </>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="text-[13px] text-fg-muted">{payout.status === "draft" ? "You're sending" : "Left to send"}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="headline text-[40px] tabular">{formatAmount(remainingTotal)}</span>
          <span className="text-lg font-medium text-fg-muted">{USDC.symbol}</span>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-y-3 text-[13px]">
          <Meta label="Recipients">{pluralize(count, "person", "people")}</Meta>
          <Meta label="Network">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-base-blue" />
              {chain.name}
            </span>
          </Meta>
          <Meta label="Signatures">Up to {signatures}</Meta>
          <Meta label="Your balance">
            {!isConnected ? (
              <span className="text-fg-subtle">—</span>
            ) : balance.isLoading ? (
              <span className="text-fg-subtle">…</span>
            ) : (
              <span className={cn("tabular", short && "text-danger-fg")}>
                {formatAmount(balance.data ?? BigInt(0))} {USDC.symbol}
              </span>
            )}
          </Meta>
        </dl>
      </div>

      <ol className="border-t border-border px-5 py-4">
        {steps.map(({ key, ...s }, i) => (
          <Step key={key} {...s} last={i === steps.length - 1} />
        ))}
      </ol>

      <div className="flex flex-col gap-2.5 border-t border-border bg-surface-sunken p-5">
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
            Approval transaction <ExternalLink className="size-3" />
          </a>
        )}
        <p className="flex items-start justify-center gap-1.5 text-center text-xs text-fg-subtle text-pretty">
          <PenLine className="mt-px size-3 shrink-0" />
          Wage3 never holds your funds. {USDC.symbol} goes straight from your wallet to each person.
        </p>
      </div>
    </Card>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
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
      <span
        className={cn(
          "relative grid size-7 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color] duration-200",
          status === "done" && "border-success bg-success text-white",
          status === "active" && "border-primary bg-primary-soft text-primary",
          status === "error" && "border-danger bg-danger-soft text-danger-fg",
          status === "todo" && "border-border bg-surface text-fg-subtle",
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
              <Check className="size-3.5" strokeWidth={3} />
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
