"use client";

import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { RecipientsEditor } from "@/components/recipients/recipients-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useCreatePayout, useList, usePayout } from "@/lib/api/queries";
import { chain, LIMITS, USDC } from "@/lib/config";
import { formatAmount, formatDate, pluralize } from "@/lib/format";
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
  } else if (fromId && from.data) {
    initialRows = rowsFromPayoutItems(from.data.items);
    initialName = `${from.data.name} (again)`;
    origin = `Copied from “${from.data.name}”`;
  }

  // Keyed so switching source remounts with fresh state.
  return (
    <Composer
      key={listId ?? fromId ?? "new"}
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
        eyebrow={
          <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-fg">
            <ArrowLeft className="size-3.5" /> Home
          </Link>
        }
        title="New payment"
        description={origin ?? "Add the people you're paying and how much. You'll review everything before anything is sent."}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <Field
              label="Name"
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
          </Card>

          <Card className="p-5">
            <RecipientsEditor rows={rows} onChange={setRows} mode="payout" showAllErrors={attempted} />
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="overflow-hidden">
            <div className="p-5">
              <div className="text-[13px] text-fg-muted">Total</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="headline text-[40px] tabular">{formatAmount(total)}</span>
                <span className="text-lg font-medium text-fg-muted">{USDC.symbol}</span>
              </div>
              <dl className="mt-5 flex flex-col gap-2.5 text-[13px]">
                <Row label="People">{validation.filledCount.toLocaleString()}</Row>
                <Row label="Transactions">{validation.filledCount ? batches : "—"}</Row>
                <Row label="Network">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-base-blue" /> {chain.name}
                  </span>
                </Row>
                <Row label="Token">{USDC.symbol}</Row>
              </dl>
            </div>
            <div className="flex flex-col gap-3 border-t border-border bg-surface-sunken p-5">
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
              <Button size="lg" className="w-full" onClick={submit} loading={create.isPending}>
                Review payment <ArrowRight className="size-4" />
              </Button>
              <p className="flex items-start gap-1.5 text-xs text-fg-subtle text-pretty">
                <Info className="mt-px size-3 shrink-0" />
                Nothing is sent yet. You&apos;ll connect your wallet and sign on the next step.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-fg-subtle">{label}</dt>
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
