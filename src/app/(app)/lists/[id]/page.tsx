"use client";

import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useFreshList } from "@/components/lists/use-create-list";
import { RecipientsEditor } from "@/components/recipients/recipients-editor";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tooltip } from "@/components/ui/tooltip";
import { ChevronLeftIcon, DeleteIcon, PeopleIcon, SendIcon } from "@/components/ui/icons";
import { LogoField } from "@/components/ui/logo-field";
import { useDeleteList, useList, useRenameList, useReplaceRecipients } from "@/lib/api/queries";
import type { ListDetail } from "@/lib/api/types";
import { LIMITS, USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { formatAmount, formatRelative, pluralize, sumAmounts } from "@/lib/format";
import { useListLogo } from "@/lib/local-prefs";
import {
  emptyRow,
  isBlankRow,
  rowsFromRecipients,
  rowsToRecipientInputs,
  validateRows,
  type RecipientRow,
} from "@/lib/recipients";
import { toastTone } from "@/components/ui/toast-tone";

/** What "changed" means: the filled rows, normalised the way the backend stores them. */
function signature(rows: RecipientRow[]) {
  return JSON.stringify(
    rows
      .filter((r) => !isBlankRow(r))
      .map((r) => [r.name.trim(), r.email.trim().toLowerCase(), r.wallet.trim().toLowerCase(), r.amount.trim()]),
  );
}

function serverRows(list: ListDetail) {
  return list.recipients.length ? rowsFromRecipients(list.recipients) : [emptyRow()];
}

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const list = useList(id);

  if (list.isLoading) return <DetailSkeleton />;

  if (list.isError) {
    if (list.error.isNotFound) {
      return (
        <EmptyState
          icon={<PeopleIcon />}
          title="List not found"
          description="It may have been deleted, or the link is wrong."
          action={
            <Button asChild variant="outline">
              <Link href="/lists">
                <ChevronLeftIcon className="size-4" /> Back to lists
              </Link>
            </Button>
          }
        />
      );
    }
    return <ErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isFetching} />;
  }

  if (!list.data) return null;
  return <ListEditor list={list.data} />;
}

function ListEditor({ list }: { list: ListDetail }) {
  const router = useRouter();
  const [rows, setRows] = useState<RecipientRow[]>(() => serverRows(list));
  const [baseline, setBaseline] = useState(() => signature(serverRows(list)));
  const [syncedFrom, setSyncedFrom] = useState(list.updated_at);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const replace = useReplaceRecipients(list.id, { meta: { errorToast: false } });
  const remove = useDeleteList();

  const dirty = signature(rows) !== baseline;

  // The server copy changed (refetch, another tab). Take it only if nothing is edited locally.
  if (list.updated_at !== syncedFrom && !dirty) {
    setSyncedFrom(list.updated_at);
    setRows(serverRows(list));
    setBaseline(signature(serverRows(list)));
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const totalDefault = useMemo(() => sumAmounts(list.recipients.map((r) => r.default_amount)), [list.recipients]);
  const count = list.recipients.length;
  const [logo, setLogo] = useListLogo(list.id);

  const discard = () => {
    const next = serverRows(list);
    setRows(next);
    setBaseline(signature(next));
    setSyncedFrom(list.updated_at);
    setShowAllErrors(false);
    setSaveError(null);
  };

  const save = () => {
    const v = validateRows(rows, "list");
    if (v.invalidCount > 0) {
      setShowAllErrors(true);
      setSaveError(null);
      toast.error("Fix the highlighted rows");
      return;
    }
    if (v.filledCount > LIMITS.listRecipients) {
      setSaveError(`A list can have at most ${LIMITS.listRecipients.toLocaleString()} people`);
      return;
    }
    setSaveError(null);
    replace.mutate(rowsToRecipientInputs(rows), {
      onSuccess: (saved) => {
        const next = serverRows(saved);
        setRows(next);
        setBaseline(signature(next));
        setSyncedFrom(saved.updated_at);
        setShowAllErrors(false);
        toast.success("List saved");
      },
      onError: (err) => setSaveError(err.message),
    });
  };

  const confirmDelete = () =>
    remove.mutate(list.id, {
      onSuccess: () => {
        toast.success(`Deleted “${list.name}”`);
        router.replace("/lists");
      },
    });

  return (
    <div className="pb-16">
      <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <InlineName list={list} />
          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 text-[15px] text-fg-muted">
            <span className="tabular">{pluralize(count, "person", "people")}</span>
            {totalDefault > BigInt(0) && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular">
                  {formatAmount(totalDefault)} {USDC.symbol} by default
                </span>
              </>
            )}
            <span aria-hidden>·</span>
            <span>Updated {formatRelative(list.updated_at)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count === 0 || dirty ? (
            <Tooltip content={dirty ? "Save your changes first" : "Add people to this list first"}>
              <span tabIndex={0} className="rounded-full">
                <Button disabled>
                  <SendIcon className="size-4" /> Pay this list
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button asChild>
              <Link href={`/pay/new?list=${list.id}`}>
                <SendIcon className="size-4" /> Pay this list
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem tone="danger" icon={<DeleteIcon />} onSelect={() => setDeleteOpen(true)}>
                Delete list
              </DropdownItem>
            </DropdownContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Optional, like the company logo in Settings. Saved on this device until the API has a field. */}
      <div className="mb-8">
        <LogoField label="Logo (optional)" value={logo} onChange={setLogo} />
      </div>

      <RecipientsEditor rows={rows} onChange={setRows} mode="list" showAllErrors={showAllErrors} />
      <p className="mt-3 text-[13px] text-fg-subtle">
        Amounts are optional defaults, prefilled when you pay this list. Up to{" "}
        {LIMITS.listRecipients.toLocaleString()} people per list; each wallet once.
      </p>

      {/* Our toast, like the selection toast: dark grey card centred on the content panel, rising
          out of a blur. It sits a toast-height higher while the selection toast is showing. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] lg:pl-60 [body:has([data-selection-toast])_&]:-translate-y-15">
        <AnimatePresence>
          {dirty && (
            <motion.div
              role="status"
              style={{ transformOrigin: "50% 100%" }}
              initial={{ opacity: 0, transform: "scale(0.92)", filter: "blur(8px)" }}
              animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }}
              exit={{ opacity: 0, transform: "scale(0.95)", filter: "blur(6px)", transition: { duration: 0.14, ease: [0.23, 1, 0.32, 1] } }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              // 12px round the buttons on every side, so the corner is concentric: 10px button + 12px = 22px.
              className={cn(
                "pointer-events-auto flex h-15 w-full max-w-[560px] items-center gap-1 rounded-[22px] py-3 pr-3 pl-4 [corner-shape:superellipse(1.5)]",
                toastTone.surface,
              )}
            >
              <div className="mr-auto min-w-0">
                <div className="truncate text-[15px] leading-5 font-medium">Unsaved changes</div>
                {/* Dropped on phones (an error still shows), so the title stays on one line. */}
                <div
                  role={saveError ? "alert" : undefined}
                  className={cn(
                    "truncate text-[13px] leading-4",
                    saveError ? toastTone.error : cn(toastTone.muted, "max-sm:hidden"),
                  )}
                >
                  {saveError ?? "Leaving this page will lose them."}
                </div>
              </div>
              <button
                type="button"
                onClick={discard}
                disabled={replace.isPending}
                className={cn("pressable h-9 shrink-0 rounded-[10px] px-2.5 text-[14px] font-semibold whitespace-nowrap disabled:opacity-45", toastTone.action)}
              >
                Discard
              </button>
              <Button
                onClick={save}
                loading={replace.isPending}
                className={cn("ml-1 h-9 rounded-[10px] px-3.5 text-[14px] font-semibold", toastTone.primary)}
              >
                {/* One span, so the button's flex gap doesn't split the words. */}
                <span>
                  Save<span className="max-sm:hidden"> changes</span>
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${list.name}”?`}
        description="The list and its people are removed. Payments you already sent from it stay in your history."
        confirmLabel="Delete list"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/** First input of the recipients editor (the first row's name), once it's on screen. */
function focusFirstRecipient() {
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>("[data-row] input:not([type=checkbox])")?.focus());
}

function InlineName({ list }: { list: ListDetail }) {
  const rename = useRenameList(list.id, { meta: { errorToast: false } });
  const fresh = useFreshList(list.id);
  // Just created with a default name: open in rename mode, name selected, so typing replaces it.
  const [editing, setEditing] = useState(fresh.isFresh);
  const [draft, setDraft] = useState(list.name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isFresh, consume } = fresh;

  useEffect(() => {
    if (!isFresh) return;
    inputRef.current?.select();
    consume();
  }, [isFresh, consume]);

  // Optimistic: show the new name while the request is in flight.
  const shown = rename.isPending && rename.variables ? rename.variables : list.name;

  const start = () => {
    setDraft(list.name);
    setError(null);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  /** Returns false when the name is invalid and the input stays open. */
  const commit = () => {
    const name = draft.trim();
    if (!name) {
      setError("Name can't be empty");
      return false;
    }
    if (name.length > LIMITS.nameLength) {
      setError(`At most ${LIMITS.nameLength} characters`);
      return false;
    }
    setEditing(false);
    if (name === list.name) return true;
    rename.mutate(name, {
      onSuccess: () => toast.success("List renamed"),
      onError: (err) => toast.error(err.message),
    });
    return true;
  };

  if (editing) {
    return (
      <div>
        <input
          ref={inputRef}
          value={draft}
          aria-label="List name"
          aria-invalid={!!error || undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // Name done: carry on straight into adding people.
              if (commit()) focusFirstRecipient();
            } else if (e.key === "Escape") {
              setEditing(false);
              setError(null);
            }
          }}
          className="headline -mx-2 w-full max-w-xl font-normal rounded-xl border border-primary bg-surface px-2 py-1 text-[28px] outline-none shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)] aria-invalid:border-danger"
        />
        {error && <p className="mt-1.5 text-[13px] text-danger-fg">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      className="group -mx-2 flex max-w-full items-center gap-2 rounded-xl px-2 py-1 text-left transition-colors duration-150 hover:bg-surface-hover"
      aria-label={`Rename ${list.name}`}
    >
      <h1 className="headline truncate text-[28px] font-normal">{shown}</h1>
      <Pencil className="size-4 shrink-0 text-fg-subtle opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="mb-6 h-4 w-16" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-72" />
      <div className="mt-10 flex justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-72 rounded-2xl" />
    </div>
  );
}
