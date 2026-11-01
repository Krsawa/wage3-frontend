"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, FileQuestion, MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BatchList, ItemsTable, PayoutProgress } from "@/components/pay/payout-receipt";
import { SaveAsListDialog } from "@/components/pay/save-as-list-dialog";
import { SendCard } from "@/components/pay/send-card";
import { RecipientsEditor } from "@/components/recipients/recipients-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { CopyIcon, DownloadIcon, ListPlusIcon, RepeatIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { PayoutStatusBadge } from "@/components/ui/status-badge";
import { useList, usePayout, useRenamePayout, useReplaceRecipients, useUpdatePayoutItems } from "@/lib/api/queries";
import type { Payout } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { downloadPayoutCsv } from "@/lib/export-payout";
import { formatDateTime, formatRelative, pluralize } from "@/lib/format";
import {
  rowsFromPayoutItems,
  rowsToPayoutItems,
  rowsToRecipientInputs,
  rowsTotal,
  validateRows,
  type RecipientRow,
} from "@/lib/recipients";
import { useReviewChecks, type RowFlag } from "@/lib/review-checks";
import { useSendPayout } from "@/lib/send-payout";

export default function PayoutPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePayout(id);

  if (query.isPending) return <PayoutSkeleton />;
  if (query.isError) {
    if (query.error.isNotFound) {
      return (
        <Card>
          <EmptyState
            icon={<FileQuestion />}
            title="Payment not found"
            description="It may have been made from another account, or the link is wrong."
            action={
              <Button asChild variant="outline">
                <Link href="/history">Go to history</Link>
              </Button>
            }
          />
        </Card>
      );
    }
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
      </Card>
    );
  }

  return <PayoutView payout={query.data} />;
}

function PayoutView({ payout }: { payout: Payout }) {
  const router = useRouter();
  const { state, start, reset } = useSendPayout(payout.id);
  const [saveOpen, setSaveOpen] = useState(false);
  const hasReady = payout.batches.some((b) => b.status === "ready");
  const sendActive = state.step !== "idle" && state.step !== "done";
  const isDraft = payout.status === "draft";

  return (
    <>
      <header className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <EditableName payout={payout} />
          {/* Status, then the facts with one even gap. Relative time, since the default name already carries the date; the exact time is on hover. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px] text-fg-muted">
            <PayoutStatusBadge status={payout.status} />
            <span>{pluralize(payout.recipient_count ?? payout.items.length, "person", "people")}</span>
            <span aria-hidden>·</span>
            <time dateTime={payout.created_at} title={formatDateTime(payout.created_at)}>
              Created {formatRelative(payout.created_at)}
            </time>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDraft && !hasReady && (
            <Button variant="outline" onClick={() => router.push(`/pay/new?from=${payout.id}`)}>
              <RepeatIcon className="size-4" /> Pay again
            </Button>
          )}
          <DropdownMenu>
            <DropdownTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem icon={<ListPlusIcon />} onSelect={() => setSaveOpen(true)}>
                Save people as a list
              </DropdownItem>
              {/* Said once: when the Pay again button shows, the menu doesn't repeat it. */}
              {(isDraft || hasReady) && (
                <DropdownItem icon={<RepeatIcon />} onSelect={() => router.push(`/pay/new?from=${payout.id}`)}>
                  Pay these people again
                </DropdownItem>
              )}
              <DropdownSeparator />
              {!isDraft && (
                <DropdownItem
                  icon={<DownloadIcon />}
                  onSelect={() => {
                    downloadPayoutCsv(payout);
                    toast.success(`Exported ${pluralize(payout.items.length, "person", "people")}`);
                  }}
                >
                  Export CSV
                </DropdownItem>
              )}
              <DropdownItem
                icon={<CopyIcon />}
                onSelect={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied");
                }}
              >
                Copy link
              </DropdownItem>
            </DropdownContent>
          </DropdownMenu>
        </div>
      </header>

      {payout.status === "cancelled" && (
        <p className="mb-6 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-fg-muted">This payment was cancelled.</p>
      )}

      {isDraft ? (
        <DraftView payout={payout} onSend={start} onRetry={start} state={state} />
      ) : hasReady || sendActive ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            {payout.batches.some((b) => b.status !== "ready") && <PayoutProgress payout={payout} />}
            <BatchList payout={payout} />
            <ItemsTable payout={payout} />
          </div>
          <aside className="lg:sticky lg:top-24">
            <SendCard
              payout={payout}
              total={BigInt(payout.total_amount ?? 0)}
              count={payout.recipient_count ?? payout.items.length}
              state={state}
              onSend={start}
              onRetry={start}
            />
          </aside>
        </div>
      ) : (
        <SentView payout={payout} justFinished={state.step === "done"} onDismiss={reset} onSave={() => setSaveOpen(true)} />
      )}

      <SaveAsListDialog key={String(saveOpen)} payout={payout} open={saveOpen} onOpenChange={setSaveOpen} />
    </>
  );
}

function SentView({
  payout,
  justFinished,
  onDismiss,
  onSave,
}: {
  payout: Payout;
  justFinished: boolean;
  onDismiss: () => void;
  onSave: () => void;
}) {
  const fromList = !!payout.list_id;
  // Sending finished: say so in a toast (the progress card below already shows the status),
  // with the save-as-list follow-up as its action. Resetting clears justFinished, so it fires once.
  useEffect(() => {
    if (!justFinished) return;
    toast(payout.status === "paid" ? "Sent and confirmed on Base" : "Sent. Base is confirming it now", {
      id: `sent-${payout.id}`, // one toast even if the effect runs twice (dev StrictMode)
      duration: fromList ? 4000 : 8000,
      action: fromList ? undefined : { label: "Save as list", onClick: onSave },
    });
    onDismiss();
  }, [justFinished, payout.id, payout.status, fromList, onSave, onDismiss]);

  return (
    <div className="flex flex-col gap-6">
      <RemainingBanner payout={payout} />
      <PayoutProgress payout={payout} />
      <BatchList payout={payout} />
      <ItemsTable payout={payout} />
    </div>
  );
}

/**
 * Partially paid: one action to pay only the people who weren't. Hidden while any batch is
 * still confirming, because a slow batch can still land and retrying it would pay twice.
 */
function RemainingBanner({ payout }: { payout: Payout }) {
  const unpaid = payout.items.filter((i) => i.status !== "paid");
  const settling = payout.batches.some((b) => b.status === "submitted");
  if (payout.status !== "partially_paid" || !unpaid.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-warning-soft px-5 py-4 text-warning-fg">
      <span className="flex-1 text-sm text-pretty">
        {settling
          ? `${pluralize(unpaid.length, "person hasn't", "people haven't")} been paid yet. Some batches are still confirming on Base, so wait before retrying.`
          : `${pluralize(unpaid.length, "person wasn't", "people weren't")} paid. Everyone else was.`}
      </span>
      {!settling && (
        <Button asChild size="sm">
          <Link href={`/pay/new?from=${payout.id}&only=unpaid`}>
            Pay the {unpaid.length.toLocaleString("en-US")} remaining
          </Link>
        </Button>
      )}
    </div>
  );
}

type ServerItem ={ name?: string | null; email?: string | null; wallet_address: string; amount: string };
const serialize = (items: ServerItem[]) =>
  JSON.stringify(items.map((i) => [i.name ?? null, i.email ?? null, i.wallet_address.toLowerCase(), i.amount]));

function DraftView({
  payout,
  state,
  onSend,
  onRetry,
}: {
  payout: Payout;
  state: ReturnType<typeof useSendPayout>["state"];
  onSend: () => void;
  onRetry: () => void;
}) {
  const [rows, setRows] = useState<RecipientRow[]>(() => rowsFromPayoutItems(payout.items));
  const [attempted, setAttempted] = useState(false);
  const save = useUpdatePayoutItems(payout.id, { meta: { errorToast: false } });

  const validation = useMemo(() => validateRows(rows, "payout"), [rows]);
  const total = useMemo(() => rowsTotal(rows), [rows]);
  const local = useMemo(() => {
    // Same normalisation as the backend: trimmed, lowercased email, blank -> null.
    const items = rowsToPayoutItems(rows).map((i) => ({ ...i, email: i.email?.toLowerCase() ?? null }));
    return validation.isValid ? serialize(items) : null;
  }, [rows, validation.isValid]);
  const dirty = local !== serialize(payout.items);
  const checks = useReviewChecks(payout, rows, total);

  // Paying a list with edits: the list only changes if the sender asks (off by default).
  const list = useList(payout.list_id ?? undefined);
  const replaceList = useReplaceRecipients(payout.list_id ?? "", { meta: { errorToast: false } });
  const [updateList, setUpdateList] = useState(false);
  const listChanged = useMemo(() => {
    if (!list.data) return false;
    const lower = (e: string | null | undefined) => e?.toLowerCase() ?? null;
    const listed = list.data.recipients.map((r) => ({ ...r, email: lower(r.email), amount: r.default_amount ?? "0" }));
    const current = rowsToPayoutItems(rows).map((i) => ({ ...i, email: lower(i.email) }));
    return serialize(current) !== serialize(listed);
  }, [list.data, rows]);

  const send = async () => {
    setAttempted(true);
    if (!validation.isValid) {
      toast.error(`Fix ${pluralize(validation.invalidCount || 1, "row", "rows")} before sending.`);
      return;
    }
    if (dirty) {
      try {
        await save.mutateAsync(rowsToPayoutItems(rows));
      } catch {
        return; // shown inline
      }
    }
    if (updateList && listChanged && list.data) {
      replaceList.mutate(rowsToRecipientInputs(rows), {
        onSuccess: () => toast.success(`Updated “${list.data.name}”`),
        onError: (e) => toast.error(`Couldn't update the list: ${e.message}`),
      });
    }
    onSend();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
      <ReviewFlags flags={checks.flags} recentDuplicate={checks.recentDuplicate} />
      {/* Light grey card; the table runs to its bottom edge, so the save notice and list option sit below it. */}
      <Card className="min-w-0 overflow-hidden bg-(--color-25) p-5">
        <RecipientsEditor
          rows={rows}
          onChange={setRows}
          mode="payout"
          flush="end"
          showAllErrors={attempted}
          disabled={state.step !== "idle" && state.step !== "error"}
        />
      </Card>
      <AnimatePresence initial={false}>
        {(dirty || save.error) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[13px]",
                save.error ? "bg-danger-soft text-danger-fg" : "bg-surface-muted text-fg-muted",
              )}
            >
              <span className="flex-1">{save.error ? save.error.message : "Changes are saved when you send, or now."}</span>
              <Button
                size="sm"
                variant="outline"
                loading={save.isPending}
                disabled={!validation.isValid}
                onClick={() =>
                  save.mutate(rowsToPayoutItems(rows), { onSuccess: () => toast.success("Draft saved") })
                }
              >
                Save draft
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {listChanged && list.data && (
        <label className="flex items-center gap-2.5 px-1 text-[13px] text-fg-muted">
          <Checkbox checked={updateList} onCheckedChange={(on) => setUpdateList(on)} />
          Update “{list.data.name}” with these changes
        </label>
      )}
      </div>
      <aside className="lg:sticky lg:top-24">
        <SendCard
          payout={payout}
          total={total}
          count={validation.filledCount}
          state={state}
          onSend={send}
          requireTypedTotal={checks.requireTypedTotal}
          onRetry={dirty ? send : onRetry}
          disabledReason={
            attempted && !validation.isValid
              ? `Fix ${pluralize(validation.invalidCount || 1, "row", "rows")} first`
              : save.isPending
                ? "Saving changes…"
                : null
          }
        />
      </aside>
    </div>
  );
}

/** Things to double-check before signing, since sent USDC can't be pulled back. */
function ReviewFlags({ flags, recentDuplicate }: { flags: RowFlag[]; recentDuplicate: string | null }) {
  if (!flags.length && !recentDuplicate) return null;
  return (
    // A notice, not a card: one solid amber fill (no translucent wash over a shadowed card), text in the amber family.
    <section className="rounded-2xl bg-warning-soft p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-(--amber-12)">
        <AlertTriangle className="size-4 shrink-0 text-warning-fg" /> Check before you send
      </h2>
      {/* Indented to the title's text, not the icon. */}
      <div className="pl-6">
        {recentDuplicate && <p className="mt-2 text-[13px] text-warning-fg">{recentDuplicate}</p>}
        {flags.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5 text-[13px]">
            {flags.slice(0, 8).map((f) => (
              <li key={f.key} className="flex flex-wrap gap-x-2">
                <span className="font-medium text-(--amber-12)">{f.who}</span>
                <span className="text-warning-fg">{f.reason}</span>
              </li>
            ))}
            {flags.length > 8 && <li className="text-warning-fg">and {flags.length - 8} more</li>}
          </ul>
        )}
      </div>
    </section>
  );
}

function EditableName({ payout }: { payout: Payout }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(payout.name);
  const rename = useRenamePayout(payout.id);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const name = value.trim();
    setEditing(false);
    if (!name || name === payout.name) return setValue(payout.name);
    if (name.length > 100) {
      setValue(payout.name);
      return toast.error("Names can be at most 100 characters.");
    }
    rename.mutate(name, { onError: () => setValue(payout.name) });
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(payout.name);
            setEditing(false);
          }
        }}
        aria-label="Payment name"
        className="headline -mx-2 w-full max-w-xl font-normal rounded-lg bg-surface-muted px-2 py-1 text-[28px] outline-none focus:shadow-[0_0_0_2px_var(--primary)]"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(payout.name);
        setEditing(true);
      }}
      className="group -mx-2 flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-hover"
      title="Rename"
    >
      <h1 className={cn("headline truncate text-[28px] font-normal", rename.isPending && "opacity-60")}>
        {rename.isPending ? rename.variables : payout.name}
      </h1>
      <Pencil className="size-4 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function PayoutSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-9 w-72" />
      <Skeleton className="mt-3 h-6 w-64" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-[28rem] rounded-2xl" />
      </div>
    </div>
  );
}
