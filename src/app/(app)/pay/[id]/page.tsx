"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Copy, FileQuestion, ListPlus, MoreHorizontal, Pencil, Repeat } from "lucide-react";
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
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { PayoutStatusBadge } from "@/components/ui/status-badge";
import { usePayout, useRenamePayout, useUpdatePayoutItems } from "@/lib/api/queries";
import type { Payout } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateTime, pluralize } from "@/lib/format";
import { rowsFromPayoutItems, rowsToPayoutItems, rowsTotal, validateRows, type RecipientRow } from "@/lib/recipients";
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
          <Link
            href={isDraft ? "/dashboard" : "/history"}
            className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-fg-subtle hover:text-fg"
          >
            <ArrowLeft className="size-3.5" /> {isDraft ? "Home" : "History"}
          </Link>
          <EditableName payout={payout} />
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-fg-muted">
            <PayoutStatusBadge status={payout.status} />
            <span>{pluralize(payout.recipient_count ?? payout.items.length, "person", "people")}</span>
            <span aria-hidden>·</span>
            <span>Created {formatDateTime(payout.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDraft && !hasReady && (
            <Button variant="outline" onClick={() => router.push(`/pay/new?from=${payout.id}`)}>
              <Repeat className="size-4" /> Pay again
            </Button>
          )}
          <DropdownMenu>
            <DropdownTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem icon={<ListPlus />} onSelect={() => setSaveOpen(true)}>
                Save people as a list
              </DropdownItem>
              <DropdownItem icon={<Repeat />} onSelect={() => router.push(`/pay/new?from=${payout.id}`)}>
                Pay these people again
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<Copy />}
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
  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence>
        {justFinished && (
          <motion.div
            initial={{ opacity: 0, transform: "translateY(-6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center gap-3 rounded-2xl bg-inverse px-5 py-4 text-inverse-fg"
          >
            <span className="size-3 rounded-[3px] bg-base-blue" />
            <span className="text-sm font-medium">
              {payout.status === "paid"
                ? "Sent and confirmed on Base."
                : "Sent. Base is confirming it now, which usually takes under a minute."}
            </span>
            <span className="ml-auto flex gap-2">
              {!fromList && (
                <Button size="sm" variant="secondary" className="bg-white/10 text-inverse-fg hover:bg-white/20" onClick={onSave}>
                  Save as list
                </Button>
              )}
              <Button size="sm" variant="secondary" className="bg-white/10 text-inverse-fg hover:bg-white/20" onClick={onDismiss}>
                Dismiss
              </Button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <PayoutProgress payout={payout} />
      <BatchList payout={payout} />
      <ItemsTable payout={payout} />
    </div>
  );
}

type ServerItem = { name?: string | null; email?: string | null; wallet_address: string; amount: string };
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
    onSend();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <Card className="min-w-0 p-5">
        <RecipientsEditor rows={rows} onChange={setRows} mode="payout" showAllErrors={attempted} disabled={state.step !== "idle" && state.step !== "error"} />
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
                  "mt-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[13px]",
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
      </Card>
      <aside className="lg:sticky lg:top-24">
        <SendCard
          payout={payout}
          total={total}
          count={validation.filledCount}
          state={state}
          onSend={send}
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
        className="headline -mx-2 w-full max-w-xl rounded-lg bg-surface-muted px-2 py-1 text-[28px] outline-none focus:shadow-[0_0_0_2px_var(--primary)] sm:text-[34px]"
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
      className="group -mx-2 flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-muted"
      title="Rename"
    >
      <h1 className={cn("headline truncate text-[28px] sm:text-[34px]", rename.isPending && "opacity-60")}>
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
