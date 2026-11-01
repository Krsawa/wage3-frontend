"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConnection } from "wagmi";

import { WalletPromptsInfo } from "@/components/pay/send-card";
import { RecipientsEditor } from "@/components/recipients/recipients-editor";
import { ConnectDialog } from "@/components/wallet/connect-dialog";
import { useUsdcBalance } from "@/components/wallet/wallet-button";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { InfoTip, Tooltip } from "@/components/ui/tooltip";
import { useCreatePayout, useList, usePayout } from "@/lib/api/queries";
import { chain, LIMITS, USDC } from "@/lib/config";
import { formatAmount, formatDate, formatFigure, pluralize } from "@/lib/format";
import { DISPLAY_FIGURE } from "@/lib/type";
import { ArrowRightIcon, WarningIcon } from "@/components/ui/icons";
import {
  emptyRow,
  rowsFromPayoutItems,
  rowsFromRecipients,
  rowsToPayoutItems,
  rowsTotal,
  validateRows,
  type RecipientRow,
} from "@/lib/recipients";

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<ComposerSkeleton />}>
      <Source />
    </Suspense>
  );
}

/** `?list=<id>` starts from a list, `?from=<payoutId>` pays a past payment again. */
function Source() {
  const params = useSearchParams();
  const listId = params.get("list") ?? undefined;
  const fromId = params.get("from") ?? undefined;
  const list = useList(listId);
  const from = usePayout(fromId);
  const source = listId ? list : fromId ? from : null;

  if (source?.isPending) return <ComposerSkeleton />;
  if (source?.isError) {
    return (
      <Card>
        <ErrorState
          error={source.error}
          title={source.error.isNotFound ? (listId ? "List not found" : "Payment not found") : undefined}
          onRetry={source.error.isNotFound ? undefined : () => source.refetch()}
          retrying={source.isFetching}
        />
        <div className="-mt-8 pb-10 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pay/new">Start from scratch</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const today = formatDate(new Date().toISOString());
  let initialRows: RecipientRow[] = [emptyRow()];
  let initialName = "";
  let origin: string | null = null;

  if (listId && list.data) {
    const rows = rowsFromRecipients(list.data.recipients);
    if (rows.length) initialRows = rows;
    initialName = `${list.data.name} · ${today}`;
    origin = `From your list “${list.data.name}”`;
  } else if (fromId && from.data && params.get("only") === "unpaid") {
    // Retry of a partially paid payment: only the people who weren't paid, so nobody is paid twice.
    const unpaid = from.data.items.filter((i) => i.status !== "paid");
    initialRows = unpaid.length ? rowsFromPayoutItems(unpaid) : initialRows;
    initialName = `${from.data.name} (remaining)`;
    origin = `The ${pluralize(unpaid.length, "person", "people")} from “${from.data.name}” who weren't paid`;
  } else if (fromId && from.data) {
    initialRows = rowsFromPayoutItems(from.data.items);
    initialName = `${from.data.name} (again)`;
    origin = `Copied from “${from.data.name}”`;
  }

  // Keyed so switching source remounts with fresh state.
  return (
    <Composer
      key={`${listId ?? fromId ?? "new"}-${params.get("only") ?? ""}`}
      listId={listId && list.data ? listId : null}
      initialRows={initialRows}
      initialName={initialName}
      origin={origin}
    />
  );
}

const MIN_REVIEW_MS = 1000;

function Composer({
  listId,
  initialRows,
  initialName,
  origin,
}: {
  listId: string | null;
  initialRows: RecipientRow[];
  initialName: string;
  origin: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [name, setName] = useState(initialName);
  const [attempted, setAttempted] = useState(false);
  const create = useCreatePayout({ meta: { errorToast: false } });
  // Intentional friction: "Review payment" holds for at least 1s (Nielsen's limit for unbroken
  // flow) so the step reads as checked, not rushed. Feedback is still instant (the label moves in
  // under 100ms, well inside the 400ms Doherty threshold). A slower server adds nothing; errors
  // show at once.
  const [holding, setHolding] = useState(false);

  const validation = useMemo(() => validateRows(rows, "payout"), [rows]);
  // Rows that can't be paid. Nothing is sent until they're fixed or removed, so say so before the
  // click: a bad wallet counts at once, other problems (a half-typed row) only after Review is tried.
  const blockedKeys = Object.keys(validation.errors).filter(
    (k) => attempted || (validation.errors[k].wallet && rows.find((r) => r.key === k)?.wallet.trim()),
  );
  // The summary counts only what can be paid; the blocked rows' amount is shown apart, not added in.
  const blocked = new Set(blockedKeys);
  const payable = rows.filter((r) => !blocked.has(r.key));
  const total = rowsTotal(payable);
  const heldTotal = rowsTotal(rows.filter((r) => blocked.has(r.key)));
  const payableCount = validation.filledCount - blockedKeys.length;
  const batches = Math.max(1, Math.ceil(payableCount / LIMITS.batchSize));
  // "Show them" narrows the table to the blocked rows as they were when clicked, so a row being
  // fixed doesn't vanish mid-edit. It lifts by itself once nothing is blocked.
  const [showOnly, setShowOnly] = useState<Set<string> | null>(null);
  if (showOnly && blockedKeys.length === 0) setShowOnly(null);
  const removeBlocked = () => {
    const drop = new Set(blockedKeys);
    const kept = rows.filter((r) => !drop.has(r.key));
    setRows(kept.length ? kept : [emptyRow()]);
    toast(`Removed ${pluralize(drop.size, "row")}`, { action: { label: "Undo", onClick: () => setRows(rows) } });
  };
  const nameError = name.trim().length > LIMITS.nameLength ? `At most ${LIMITS.nameLength} characters` : null;

  const submit = () => {
    setAttempted(true);
    if (!validation.filledCount) return toast.error("Add at least one person to pay.");
    if (!validation.isValid || nameError) {
      return toast.error(`Fix ${pluralize(validation.invalidCount || 1, "row", "rows")} before continuing.`);
    }
    const started = performance.now();
    setHolding(true);
    create.mutate(
      {
        name: name.trim() || null,
        list_id: listId,
        chain_id: chain.id,
        token_address: USDC.address,
        items: rowsToPayoutItems(rows),
      },
      {
        onSuccess: (payout) => {
          const wait = Math.max(0, MIN_REVIEW_MS - (performance.now() - started));
          setTimeout(() => router.push(`/pay/${payout.id}`), wait);
        },
        onError: () => setHolding(false),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="New payment"
        description={origin ?? "Add who you're paying and how much. You'll review it all before anything is sent."}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div>
          {/* The main job first (goal-gradient): who and how much. The name is optional, so it follows in the same card. */}
          <Card className="p-5">
            {/* Above the table it's about, like the import dialog's banner; red because it blocks sending. */}
            {blockedKeys.length > 0 && (
              // One line on desktop: 12px round the pill button on every side, so the corner is 16 + 12 = 28px.
              // On phones the button drops under the text, lined up with it, and the icon keeps to line one.
              <div
                role="status"
                className="mb-4 flex flex-col items-start gap-3 rounded-2xl bg-danger-soft p-4 text-danger-fg [corner-shape:superellipse(1.5)] sm:flex-row sm:items-center sm:rounded-[28px] sm:py-3 sm:pr-3"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <WarningIcon className="mt-0.5 size-4 shrink-0" />
                  <p className="text-[13px] leading-5 text-pretty">
                    <span className="font-medium text-(--red-12)">
                      {pluralize(blockedKeys.length, "row", "rows")} can&apos;t be paid.
                    </span>{" "}
                    Fix or remove {blockedKeys.length === 1 ? "it" : "them"} to send.
                  </p>
                </div>
                <div className="ml-7 flex gap-1 sm:ml-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-pressed={!!showOnly}
                    className="text-(--red-12) hover:bg-(--red-4) hover:text-(--red-12)"
                    onClick={() => setShowOnly(showOnly ? null : new Set(blockedKeys))}
                  >
                    {showOnly ? "Show all" : `Show ${blockedKeys.length === 1 ? "it" : "them"}`}
                  </Button>
                  <Button size="sm" className="bg-(--red-11) text-white hover:bg-(--red-12)" onClick={removeBlocked}>
                    Remove {blockedKeys.length === 1 ? "it" : "them"}
                  </Button>
                </div>
              </div>
            )}
            <RecipientsEditor
              rows={rows}
              onChange={setRows}
              mode="payout"
              // Showing the blocked rows also shows their faults, without waiting for a Review attempt.
              showAllErrors={attempted || !!showOnly}
              only={showOnly}
              flush
            />
            <div className="pt-5">
              <Field
                label="Name (optional)"
                htmlFor="payout-name"
                hint="Shown in your history. Leave blank for today's date."
                error={nameError}
              >
                <Input
                  id="payout-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Payment ${formatDate(new Date().toISOString())}`}
                  invalid={!!nameError}
                />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="overflow-hidden">
            <div className="p-5">
              <div className="text-[13px] font-medium text-fg-muted">Total</div>
              {/* The figure's line box is its own size (24px), so 8px either side keeps the group apart. */}
              <div className="mt-2 flex items-baseline gap-2">
                <span className={cn(DISPLAY_FIGURE, "text-[24px]")} title={`${formatAmount(total)} ${USDC.symbol}`}>{formatFigure(total)}</span>
                <span className="text-sm text-fg-muted">{USDC.symbol}</span>
              </div>
              {/* Neither plus nor minus: the blocked rows are left out of the total, so it says "not
                  included". One quiet line; the red banner above the table says which rows and why. */}
              {blockedKeys.length > 0 && (
                <div className="mt-2 text-[13px] text-fg-muted tabular" title={`${formatAmount(heldTotal)} ${USDC.symbol}`}>
                  {formatFigure(heldTotal)} {USDC.symbol} not included
                </div>
              )}
              <dl className="mt-5 flex flex-col gap-2.5 text-[13px]">
                <Row label="People">{payableCount.toLocaleString()}</Row>
                {/* Same wording as the send card: one approval plus one transaction per batch of 200. */}
                <Row label="Permissions required" info={<WalletPromptsInfo />}>{payableCount ? `Up to ${batches + 1}` : "—"}</Row>
                <Row label="Network">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-base-blue" /> {chain.name}
                  </span>
                </Row>
              </dl>
              <BalanceCheck total={total} />
            </div>
            {/* Fill alone separates the action area. The disabled reason sits with the button; the reassurance is set apart. */}
            <div className="flex flex-col gap-4 bg-surface-sunken p-5">
              {create.error && (
                <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger-fg">
                  {create.error.message}
                </p>
              )}
              {/* No helper lines under the button: why it's disabled lives in its tooltip. */}
              <Tooltip content={validation.filledCount ? null : "Add at least one person first"}>
                <span tabIndex={validation.filledCount ? -1 : 0} className="block rounded-full">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={submit}
                    loading={create.isPending || holding}
                    disabled={!validation.filledCount}
                  >
                    Review payment <ArrowRightIcon className="size-4" />
                  </Button>
                </span>
              </Tooltip>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

/**
 * Total vs balance while composing. Never blocks: an over-budget payment can still be
 * saved as a draft. The wallet is only required when sending.
 */
function BalanceCheck({ total }: { total: bigint }) {
  const { isConnected } = useConnection();
  const balance = useUsdcBalance();
  const [connectOpen, setConnectOpen] = useState(false);

  if (!isConnected) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="mt-4 text-[13px] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Connect wallet to check balance
        </button>
        <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </>
    );
  }
  if (balance.data === undefined) return null;

  const short = total - balance.data;
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-[13px]",
        short > BigInt(0) ? "bg-danger-soft text-danger-fg" : "bg-surface-muted text-fg-muted",
      )}
    >
      <span className="shrink-0">Your balance</span>
      {/* Big figures go compact (exact in the title) so the row stays one line at any size. */}
      <span
        className="min-w-0 truncate font-medium tabular"
        title={`${formatAmount(balance.data, USDC.decimals, { maxFraction: 2 })} ${USDC.symbol}${short > BigInt(0) ? ` · short ${formatAmount(short)}` : ""}`}
      >
        {formatFigure(balance.data)} {USDC.symbol}
        {short > BigInt(0) && <span className="font-normal"> · short {formatFigure(short)}</span>}
      </span>
    </div>
  );
}

function Row({ label, info, children }: { label: string; info?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-1 text-fg-subtle">
        {label}
        {info && (
          <InfoTip label={label} align="start">
            {info}
          </InfoTip>
        )}
      </dt>
      <dd className="font-medium tabular">{children}</dd>
    </div>
  );
}

function ComposerSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
