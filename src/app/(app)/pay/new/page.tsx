"use client";

import { ArrowRight } from "lucide-react";
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
import { InfoTip } from "@/components/ui/tooltip";
import { useCreatePayout, useList, usePayout } from "@/lib/api/queries";
import { chain, LIMITS, USDC } from "@/lib/config";
import { formatAmount, formatDate, pluralize } from "@/lib/format";
import { DISPLAY_FIGURE } from "@/lib/type";
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

  const validation = useMemo(() => validateRows(rows, "payout"), [rows]);
  const total = useMemo(() => rowsTotal(rows), [rows]);
  const batches = Math.max(1, Math.ceil(validation.filledCount / LIMITS.batchSize));
  const nameError = name.trim().length > LIMITS.nameLength ? `At most ${LIMITS.nameLength} characters` : null;

  const submit = () => {
    setAttempted(true);
    if (!validation.filledCount) return toast.error("Add at least one person to pay.");
    if (!validation.isValid || nameError) {
      return toast.error(`Fix ${pluralize(validation.invalidCount || 1, "row", "rows")} before continuing.`);
    }
    create.mutate(
      {
        name: name.trim() || null,
        list_id: listId,
        chain_id: chain.id,
        token_address: USDC.address,
        items: rowsToPayoutItems(rows),
      },
      { onSuccess: (payout) => router.push(`/pay/${payout.id}`) },
    );
  };

  return (
    <>
      <PageHeader
        title="New payment"
        description={origin ?? "Add the people you're paying and how much. You'll review everything before anything is sent."}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div>
          {/* The main job first (goal-gradient): who and how much. The name is optional, so it follows in the same card. */}
          <Card className="p-5">
            <RecipientsEditor rows={rows} onChange={setRows} mode="payout" showAllErrors={attempted} flush />
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
              <div className="mt-1 flex items-baseline gap-2">
                <span className={cn(DISPLAY_FIGURE, "text-[24px]")}>{formatAmount(total)}</span>
                <span className="text-sm text-fg-muted">{USDC.symbol}</span>
              </div>
              <dl className="mt-5 flex flex-col gap-2.5 text-[13px]">
                <Row label="People">{validation.filledCount.toLocaleString()}</Row>
                {/* Same wording as the send card: one approval plus one transaction per batch of 200. */}
                <Row label="Wallet prompts" info={<WalletPromptsInfo />}>{validation.filledCount ? `Up to ${batches + 1}` : "—"}</Row>
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
              {attempted && validation.invalidCount > 0 && (
                <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger-fg">
                  {pluralize(validation.invalidCount, "row needs", "rows need")} fixing.
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={submit}
                  loading={create.isPending}
                  disabled={!validation.filledCount}
                >
                  Review payment <ArrowRight className="size-4" />
                </Button>
                {!validation.filledCount && (
                  <p className="text-center text-[13px] text-fg-muted">Add at least one person to continue.</p>
                )}
              </div>
              <p className="text-center text-xs text-balance text-fg-subtle">
                Nothing is sent yet. You&apos;ll connect your wallet and sign on the next step.
              </p>
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
        "mt-4 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px]",
        short > BigInt(0) ? "bg-danger-soft text-danger-fg" : "bg-surface-muted text-fg-muted",
      )}
    >
      <span>Your balance</span>
      <span className="font-medium tabular">
        {formatAmount(balance.data, USDC.decimals, { maxFraction: 2 })} {USDC.symbol}
        {short > BigInt(0) && <span className="font-normal"> · short {formatAmount(short)}</span>}
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
