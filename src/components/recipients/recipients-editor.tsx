"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useConnection } from "wagmi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { ChevronLeftIcon, CloseIcon, DeleteIcon, EqualIcon, FileIcon, ImportIcon, PlusIcon, SplitIcon, HashIcon, CommandIcon } from "@/components/ui/icons";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useHydrated } from "@/lib/auth/use-session";
import { LIMITS, USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { formatAmount, parseAmount, pluralize, toInputAmount } from "@/lib/format";
import {
  emptyRow,
  isBlankRow,
  parseRecipientsText,
  rowsTotal,
  validateRows,
  type EditorMode,
  type RecipientRow,
  type RowErrors,
} from "@/lib/recipients";

import { ImportDialog, readRecipientsFile, type ParsedImport } from "./import-dialog";

const PAGE = 100;

/**
 * Row enter/exit. Entering rows dissolve in from a light blur; leaving rows only fade, a
 * subtler, cheaper exit (dozens can leave at once on Show them). Layout then closes the gap.
 */
const ROW_MOTION = {
  hidden: { opacity: 0, filter: "blur(3px)" },
  shown: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.22 } },
  gone: { opacity: 0, transition: { duration: 0.18 } },
};

const GRID =
  "md:grid-cols-[2.75rem_2rem_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_2.5rem]";

type Field = keyof RowErrors;

export function RecipientsEditor({
  rows,
  onChange,
  mode,
  showAllErrors = false,
  disabled = false,
  flush = false,
  only = null,
  max = mode === "list" ? LIMITS.listRecipients : LIMITS.payoutItems,
}: {
  rows: RecipientRow[];
  onChange: (rows: RecipientRow[]) => void;
  mode: EditorMode;
  /** Set after a failed submit, so untouched fields show their errors too. */
  showAllErrors?: boolean;
  disabled?: boolean;
  /**
   * Inside a card with 20px padding: the table runs to the card's edges instead of a nested box.
   * `true` rules it top and bottom (more content follows); "end" also runs it off the card's bottom.
   */
  flush?: boolean | "end";
  /** Show just these rows (keeping their row numbers), e.g. the ones that can't be paid. */
  only?: Set<string> | null;
  max?: number;
}) {
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(PAGE);
  const [importOpen, setImportOpen] = useState(false);
  const [dropped, setDropped] = useState<ParsedImport | null>(null);
  const [bulk, setBulk] = useState<null | "same" | "split">(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { errors, duplicates, filledCount } = useMemo(() => validateRows(rows, mode), [rows, mode]);
  const ownWallet = useConnection().address?.toLowerCase();
  const total = useMemo(() => rowsTotal(rows), [rows]);
  const atLimit = filledCount >= max;

  // Only filled rows are selectable: selecting an empty row means nothing.
  const filledKeys = useMemo(() => rows.filter((r) => !isBlankRow(r)).map((r) => r.key), [rows]);
  const sel = useRowSelection(filledKeys);
  const existingWallets = useMemo(
    () => new Set(rows.map((r) => r.wallet.trim().toLowerCase()).filter(Boolean)),
    [rows],
  );

  const clearDropped = useCallback(() => setDropped(null), []);
  const pageDragging = usePageFileDrop({
    enabled: !disabled && !importOpen,
    onDrop: (file) =>
      readRecipientsFile(file).then((parsed) => {
        setDropped(parsed);
        setImportOpen(true);
      }),
  });

  const update = (key: string, field: keyof RecipientRow, value: string) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const touch = (key: string, field: Field) =>
    setTouched((t) => (t.has(`${key}.${field}`) ? t : new Set(t).add(`${key}.${field}`)));

  const errorFor = (key: string, field: Field) =>
    showAllErrors || touched.has(`${key}.${field}`) ? errors[key]?.[field] : undefined;

  const focusRow = (key: string) =>
    requestAnimationFrame(() =>
      containerRef.current?.querySelector<HTMLInputElement>(`[data-row="${key}"] input:not([type=checkbox])`)?.focus(),
    );

  const addRow = () => {
    if (atLimit) return toast.error(`You can add up to ${max.toLocaleString()} people.`);
    const row = emptyRow();
    onChange([...rows, row]);
    setVisible((v) => Math.max(v, rows.length + 1));
    focusRow(row.key);
  };

  const removeRow = (key: string) => {
    const next = rows.filter((r) => r.key !== key);
    onChange(next.length ? next : [emptyRow()]);
  };

  const removeSelected = () => {
    const before = rows;
    const count = sel.count;
    const next = rows.filter((r) => !sel.selected.has(r.key));
    onChange(next.length ? next : [emptyRow()]);
    sel.clear();
    toast(`Removed ${pluralize(count, "person", "people")}`, {
      action: { label: "Undo", onClick: () => onChange(before) },
    });
  };

  // New people go to the bottom; the empty starter row is dropped.
  const importRows = (incoming: RecipientRow[], replace = false) => {
    const kept = replace ? [] : rows.filter((r) => !isBlankRow(r));
    const room = max - kept.length;
    const added = incoming.slice(0, Math.max(0, room));
    const next = [...kept, ...added];
    onChange(next.length ? next : [emptyRow()]);
    setVisible((v) => Math.max(v, next.length));
    if (incoming.length > added.length) {
      toast.warning(`Only ${added.length} of ${incoming.length} people were added. The limit is ${max.toLocaleString()}.`);
    } else {
      toast.success(`${replace ? "Replaced with" : "Added"} ${pluralize(added.length, "person", "people")}`);
    }
    if (!replace && added.length && kept.length) {
      // Show where they went.
      requestAnimationFrame(() =>
        containerRef.current
          ?.querySelector(`[data-row="${added[0].key}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    }
  };

  // Pasting several lines from a spreadsheet into any cell imports them as rows.
  const onPaste = (e: ClipboardEvent<HTMLInputElement>, key: string) => {
    const text = e.clipboardData.getData("text");
    if (!/[\n\t]/.test(text.trim())) return;
    e.preventDefault();
    const result = parseRecipientsText(text);
    if (result.error) return toast.error(result.error);
    const current = rows.find((r) => r.key === key);
    const base = current && isBlankRow(current) ? rows.filter((r) => r.key !== key) : rows;
    const kept = base.filter((r) => !isBlankRow(r));
    onChange([...kept, ...result.rows].slice(0, max));
    toast.success(`Pasted ${pluralize(result.rows.length, "person", "people")}`);
  };

  const onLastKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter" && index === rows.length - 1) {
      e.preventDefault();
      addRow();
    }
  };

  // Bulk amounts apply to the selection if there is one, else to everyone.
  // Bulk amounts apply to the selection, else to every row in view (all of them unless filtered).
  const bulkTargets = rows.filter(
    (r) => !isBlankRow(r) && (sel.count === 0 ? !only || only.has(r.key) : sel.selected.has(r.key)),
  );

  const applyBulk = (value: string) => {
    const parsed = parseAmount(value);
    if (!parsed.ok) return parsed.error;
    if (!bulkTargets.length) return "Add people first";
    let amounts: string[];
    if (bulk === "same") {
      amounts = bulkTargets.map(() => toInputAmount(parsed.value));
    } else {
      const { each, leftover } = splitEvenly(BigInt(parsed.value), bulkTargets.length);
      if (each === BigInt(0)) return "That total is too small to split";
      amounts = bulkTargets.map(() => toInputAmount(each.toString()));
      if (leftover > BigInt(0)) {
        toast(`${formatAmount(leftover)} ${USDC.symbol} wasn't assigned (rounding to the cent).`);
      }
    }
    const byKey = new Map(bulkTargets.map((r, i) => [r.key, amounts[i]]));
    onChange(rows.map((r) => (byKey.has(r.key) ? { ...r, amount: byKey.get(r.key)! } : r)));
    setBulk(null);
    return null;
  };

  // Each row keeps its number in the full list, filtered or not.
  const numbered = rows.map((r, n) => ({ r, n }));
  const shown = (only ? numbered.filter(({ r }) => only.has(r.key)) : numbered).slice(0, visible);
  const amountLabel = mode === "list" ? "Default amount" : "Amount";
  const selecting = sel.count > 0;
  // Entering or leaving a selection changes who a bulk amount applies to, so close any open form.
  const [wasSelecting, setWasSelecting] = useState(selecting);
  if (wasSelecting !== selecting) {
    setWasSelecting(selecting);
    setBulk(null);
  }
  const hydrated = useHydrated();

  return (
    <div
      ref={containerRef}
      className="flex flex-col"
      onKeyDown={(e) => {
        if (e.key === "Escape" && selecting) sel.clear();
      }}
    >
      {/* Toolbar: totals + tools. Selection actions live in the toast below. */}
      <div className="flex min-h-12 flex-wrap items-center gap-2 pb-4">
        <div className="mr-auto flex items-baseline gap-3">
          {/* Filtered, the count says so: "2 of 3 people", with the amount of the rows in view. */}
          <span className="text-sm font-medium">
            {only ? `${shown.length} of ${pluralize(filledCount, "person", "people")}` : pluralize(filledCount, "person", "people")}
          </span>
          {only ? (
            <span className="text-sm text-fg-muted tabular">
              {formatAmount(rowsTotal(rows.filter((r) => only.has(r.key))))} {USDC.symbol}
            </span>
          ) : total > BigInt(0) && (
            <span className="text-sm text-fg-muted tabular">
              {formatAmount(total)} {USDC.symbol}
            </span>
          )}
        </div>
        {!disabled && (
          <>
            {filledCount > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setBulk(bulk === "same" ? null : "same")}>
                  <EqualIcon className="size-4" /> Same amount
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setBulk(bulk === "split" ? null : "split")}>
                  <SplitIcon className="size-4" /> Split total
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <ImportIcon className="size-4" /> Import CSV
            </Button>
          </>
        )}
      </div>

      {hydrated &&
        createPortal(
          <AnimatePresence>
            {selecting && !disabled && (
              <SelectionToast
                count={sel.count}
                total={rowsTotal(bulkTargets)}
                bulk={bulk}
                onBulk={setBulk}
                onApply={applyBulk}
                onRemove={removeSelected}
                onClear={() => sel.clear()}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}

      <AnimatePresence initial={false}>
        {bulk && !selecting && (
          <BulkBar
            key={bulk}
            kind={bulk}
            count={bulkTargets.length}
            scoped={false}
            onApply={applyBulk}
            onClose={() => setBulk(null)}
          />
        )}
      </AnimatePresence>

      {/* Nobody yet: one quiet line for the CSV route. Desktop only: phones can't drag files in. */}
      <AnimatePresence initial={false}>
        {filledCount === 0 && !disabled && (
          <motion.button
            type="button"
            onClick={() => setImportOpen(true)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            className="group hidden overflow-hidden text-left md:block"
          >
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-fg-muted transition-colors duration-150 group-hover:bg-surface-hover">
              <FileIcon className="size-4 shrink-0" />
              <span>
                Drop a CSV anywhere on this page, or <span className="font-medium text-fg">choose a file</span>.
                You&apos;ll pick who to add before anything changes.
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Table */}
      <div
        className={cn(
          flush === "end" ? "-mx-5 -mb-5 border-t border-border" : flush ? "-mx-5 border-y border-border" : "overflow-hidden rounded-2xl border border-border",
        )}
      >
        <div
          className={cn(
            "hidden gap-px border-b border-border bg-surface-sunken text-xs font-medium text-fg-subtle md:grid",
            GRID,
            flush && "md:pl-1.5",
          )}
        >
          <span className="flex items-center justify-center py-2.5">
            {!disabled && (
              <Checkbox
                checked={sel.isAll}
                indeterminate={sel.isSome}
                disabled={!filledKeys.length}
                onCheckedChange={(on) => sel.setAll(on)}
                aria-label="Select everyone"
              />
            )}
          </span>
          <span className="flex justify-end py-2.5 pr-2">
            <HashIcon className="size-3.5" aria-hidden={false} role="img" aria-label="Row" />
          </span>
          <span className="px-3 py-2.5">Name</span>
          <span className="px-3 py-2.5">Email</span>
          <span className="px-3 py-2.5">Wallet address</span>
          <span className="px-3 py-2.5 text-right whitespace-nowrap">
            {amountLabel} <span className="text-fg-subtle/70">({USDC.symbol})</span>
          </span>
          <span />
        </div>

        <ul className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {shown.map(({ r, n: i }) => {
              const blank = isBlankRow(r);
              const checked = sel.selected.has(r.key);
              return (
                <motion.li
                  key={r.key}
                  data-row={r.key}
                  // Rows leaving (Show them, Remove) dissolve; once they're gone the rest glide together.
                  layout="position"
                  variants={ROW_MOTION}
                  initial="hidden"
                  animate="shown"
                  exit="gone"
                  transition={{ layout: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } }}
                  className={cn(
                    "group grid grid-cols-[minmax(0,1fr)_2.5rem] gap-x-2 gap-y-1 p-3 transition-colors duration-100 md:items-start md:gap-0 md:p-0",
                    GRID,
                    flush && "px-5 md:pl-1.5",
                  )}
                >
                  {/* Selection is desktop only: on phones the bulk tools apply to everyone. */}
                  <span className="hidden justify-center md:flex md:pt-3.5">
                    {!disabled && !blank && (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(on, e) => sel.toggle(r.key, on, e?.shiftKey)}
                        aria-label={`Select ${r.name || `row ${i + 1}`}`}
                      />
                    )}
                  </span>
                  <span className={cn("hidden pt-3 pr-2 text-right text-xs tabular md:block", checked ? "text-(--blue-11)" : "text-fg-subtle")}>
                    {i + 1}
                  </span>
                  <div className="grid grid-cols-2 gap-2 md:contents">
                    <Cell
                      selected={checked}
                      value={r.name}
                      placeholder="Name"
                      error={errorFor(r.key, "name")}
                      disabled={disabled}
                      onChange={(v) => update(r.key, "name", v)}
                      onBlur={() => touch(r.key, "name")}
                      onPaste={(e) => onPaste(e, r.key)}
                      autoComplete="off"
                    />
                    <Cell
                      selected={checked}
                      value={r.email}
                      placeholder="Email"
                      type="email"
                      error={errorFor(r.key, "email")}
                      disabled={disabled}
                      onChange={(v) => update(r.key, "email", v)}
                      onBlur={() => touch(r.key, "email")}
                      onPaste={(e) => onPaste(e, r.key)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-start-1 md:contents">
                    <Cell
                      selected={checked}
                      value={r.wallet}
                      placeholder="0x…"
                      mono
                      error={errorFor(r.key, "wallet")}
                      warning={
                        mode !== "payout"
                          ? undefined
                          : duplicates.has(r.key)
                            ? "Paid twice in this payment"
                            : ownWallet && r.wallet.trim().toLowerCase() === ownWallet
                              ? "This is your connected wallet"
                              : undefined
                      }
                      disabled={disabled}
                      onChange={(v) => update(r.key, "wallet", v)}
                      onBlur={() => touch(r.key, "wallet")}
                      onPaste={(e) => onPaste(e, r.key)}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-start-1 md:contents">
                    <Cell
                      selected={checked}
                      value={r.amount}
                      placeholder={mode === "list" ? "Optional" : "0.00"}
                      inputMode="decimal"
                      align="right"
                      mono
                      error={errorFor(r.key, "amount")}
                      disabled={disabled}
                      onChange={(v) => update(r.key, "amount", v.replace(/[^\d.,]/g, ""))}
                      onBlur={() => touch(r.key, "amount")}
                      onKeyDown={(e) => onLastKeyDown(e, i)}
                    />
                  </div>
                  {!disabled ? (
                    <div className="col-start-2 row-span-3 row-start-1 flex justify-end pt-1 md:col-auto md:row-auto md:row-span-1 md:justify-center md:pt-1.5">
                      <Tooltip content="Remove">
                        <button
                          type="button"
                          onClick={() => removeRow(r.key)}
                          className="pressable grid size-8 place-items-center rounded-lg text-fg-subtle opacity-100 hover:bg-danger-soft hover:text-danger-fg md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                          aria-label={`Remove row ${i + 1}`}
                        >
                          <DeleteIcon className="size-4" />
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <span />
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {!only && rows.length > visible && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE * 5)}
            className="w-full border-t border-border bg-surface-sunken py-3 text-sm font-medium text-fg-muted hover:text-fg"
          >
            Show {Math.min(rows.length - visible, PAGE * 5)} more of {rows.length - visible}
          </button>
        )}

        {/* Hidden while filtered: a new row wouldn't match the filter, so it would appear to do nothing. */}
        {!disabled && !only && (
          <button
            type="button"
            onClick={addRow}
            disabled={atLimit}
            className={cn(
              "flex w-full items-center gap-2 border-t border-border py-3 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg disabled:opacity-45",
              flush ? "px-5" : "px-4",
            )}
          >
            <PlusIcon className="size-4" /> Add person
            <span className="ml-auto hidden items-center gap-1 text-xs font-normal text-fg-subtle sm:inline-flex">
              <Kbd>
                <CommandIcon className="size-2.5" strokeWidth={2.5} aria-hidden={false} role="img" aria-label="Command" />
              </Kbd>
              <Kbd>V</Kbd> to paste
            </span>
          </button>
        )}
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={(o) => {
          setImportOpen(o);
          if (!o) setDropped(null);
        }}
        onImport={importRows}
        hasRows={filledCount > 0}
        mode={mode}
        existingWallets={existingWallets}
        room={max - filledCount}
        dropped={dropped}
        onClearDropped={clearDropped}
      />

      <PageDropOverlay active={pageDragging} />
    </div>
  );
}

/**
 * Lets a file be dropped anywhere on the page. A depth counter stops the overlay
 * flickering as the drag crosses child elements.
 */
function usePageFileDrop({ enabled, onDrop }: { enabled: boolean; onDrop: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  });

  useEffect(() => {
    if (!enabled) return;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");

    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current++;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault(); // required for drop to fire
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // stop the browser opening the file
      depth.current = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) onDropRef.current(file);
    };

    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      depth.current = 0;
      setDragging(false);
    };
  }, [enabled]);

  return dragging;
}

function PageDropOverlay({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed inset-0 z-[60] bg-bg/80 p-3 backdrop-blur-[2px]"
        >
          <div className="grid h-full place-items-center rounded-3xl border-2 border-dashed border-primary bg-primary-soft/50">
            <motion.div
              initial={{ opacity: 0, transform: "scale(0.96)" }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center text-center"
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-fg">
                <FileIcon className="size-6" />
              </span>
              <span className="mt-4 text-lg font-semibold tracking-[-0.02em]">Drop to import people</span>
              <span className="mt-1 text-sm text-fg-muted">CSV with name, email, wallet and amount columns</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A key as a small keycap, read inline with the tip around it. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-px inline-grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-surface px-1 align-middle font-sans text-[11px] leading-none font-medium text-fg-muted shadow-(--shadow-xs) [text-box:trim-both_cap_alphabetic]">
      {children}
    </kbd>
  );
}

// Dark grey, a step up from the #111 blacks (user's call over blue 10). White on it is about 15:1.
const TOAST_BG = "bg-[oklch(0.25_0_0)]";

/**
 * Selection as a toast, after X's iOS toasts: a solid dark card that rises from the bottom,
 * says what's selected, and updates in place as rows are ticked. Picking Set amount or
 * Split total turns the same toast into the amount form, so it stays in view on long lists.
 */
function SelectionToast({
  count,
  total,
  bulk,
  onBulk,
  onApply,
  onRemove,
  onClear,
}: {
  count: number;
  total: bigint;
  bulk: null | "same" | "split";
  onBulk: (b: null | "same" | "split") => void;
  onApply: (value: string) => string | null;
  onRemove: () => void;
  onClear: () => void;
}) {
  return (
    // Centred on the content panel: the desktop sidebar is 240px.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pl-60">
      <motion.div
        role="status"
        data-selection-toast
        layout
        // Scales up out of a blur, and back into one on the way out (origin at its bottom edge).
        style={{ transformOrigin: "50% 100%" }}
        initial={{ opacity: 0, transform: "scale(0.92)", filter: "blur(8px)" }}
        animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }}
        exit={{ opacity: 0, transform: "scale(0.95)", filter: "blur(6px)", transition: { duration: 0.14, ease: [0.23, 1, 0.32, 1] } }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          // 8px round the 10px buttons, so an 18px corner keeps them concentric.
          "pointer-events-auto flex min-h-13 w-full max-w-[560px] items-center gap-1 rounded-[18px] py-2 pr-2 pl-4 text-white shadow-lg [corner-shape:superellipse(1.5)]",
          TOAST_BG,
        )}
      >
        {bulk ? (
          <motion.div layout="position" key="form" className="flex-1">
            <BulkBar kind={bulk} count={count} scoped tone="toast" onApply={onApply} onClose={() => onBulk(null)} />
          </motion.div>
        ) : (
          <motion.div layout="position" key="summary" className="flex min-w-0 flex-1 items-center gap-1">
            <p className="mr-auto flex min-w-0 items-baseline gap-1 text-[15px] font-medium tabular">
              {/* The count rolls rather than swapping, so adding people reads as one toast updating. */}
              <span className="relative inline-flex overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={count}
                    initial={{ opacity: 0, transform: "translateY(60%)" }}
                    animate={{ opacity: 1, transform: "translateY(0%)" }}
                    exit={{ opacity: 0, transform: "translateY(-60%)" }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {count.toLocaleString()}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span>selected</span>
              <span className="ml-1 truncate text-[13px] font-normal text-white/75">
                {formatAmount(total)} {USDC.symbol}
              </span>
            </p>
            <ToastAction onClick={() => onBulk("same")}>Set amount</ToastAction>
            <ToastAction onClick={() => onBulk("split")}>Split</ToastAction>
            <ToastAction onClick={onRemove}>Remove</ToastAction>
            {/* Done finishes the edit and clears the selection (the toast leaves with it). It replaces
                a close ✕ that did the same thing, so there's one way out, styled like Apply. */}
            <Tooltip content="Finish and clear the selection (Esc)">
              <button
                type="button"
                onClick={onClear}
                className="pressable ml-1 h-9 shrink-0 rounded-[10px] bg-white px-3.5 text-[14px] font-semibold whitespace-nowrap text-fg hover:bg-(--color-200)"
              >
                Done
              </button>
            </Tooltip>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/** Bold white text action, like the "View" on X's toasts. */
function ToastAction({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable h-9 shrink-0 rounded-[10px] px-2.5 text-[14px] font-semibold whitespace-nowrap hover:bg-white/15"
    >
      {children}
    </button>
  );
}

function Cell({
  value,
  onChange,
  error,
  warning,
  mono,
  align,
  selected,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  warning?: string;
  mono?: boolean;
  align?: "right";
  /** Row is ticked: the text turns a darker step of the selection blue (no row fill). */
  selected?: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        title={error ?? warning}
        className={cn(
          // Phones: a field like the app's inputs (12px radius, subtle edge that darkens on hover, blue
          // focus ring). Desktop: a borderless table cell with an inset focus line.
          "h-10 w-full min-w-0 rounded-xl border border-border-subtle bg-surface px-3 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-150",
          "hover:border-border focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)]",
          "md:h-11 md:rounded-[6px] md:border-transparent md:bg-transparent md:hover:border-transparent md:hover:bg-surface-hover",
          "md:focus:border-transparent md:focus:bg-surface md:focus:shadow-[inset_0_0_0_1px_var(--primary)]",
          "placeholder:text-fg-subtle/80 disabled:cursor-default disabled:hover:bg-transparent",
          mono && "font-mono text-[13px] tabular",
          align === "right" && "md:text-right",
          selected && "text-(--blue-11)",
          // Invalid: red fill and a red border (the red scale's border step), on desktop too
          // where table cells are otherwise borderless.
          error && "border-(--red-7) bg-danger-soft/60 text-danger-fg md:border-(--red-7) md:bg-danger-soft/50",
          // Desktop: the message sits inside the cell's bottom edge, so the value moves up and the
          // row keeps its 44px height whatever the fault. While editing, the message steps aside and
          // the value returns to centre.
          (error || warning) && "peer md:pb-3.5 md:focus:pb-0",
          className,
        )}
        {...props}
      />
      {(error || warning) && (
        <p
          className={cn(
            "px-1 pt-1 pb-0.5 text-xs peer-focus:hidden",
            "md:pointer-events-none md:absolute md:inset-x-3 md:bottom-1.5 md:truncate md:p-0 md:text-[11px] md:leading-[14px]",
            align === "right" && "md:text-right",
            error ? "text-danger-fg" : "text-warning-fg",
          )}
        >
          {error ?? warning}
        </p>
      )}
    </div>
  );
}

function BulkBar({
  kind,
  count,
  scoped,
  onApply,
  onClose,
  tone = "inline",
}: {
  tone?: "inline" | "toast";
  kind: "same" | "split";
  count: number;
  /** True when applying to the selected rows only. */
  scoped: boolean;
  onApply: (value: string) => string | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const preview = (() => {
    const p = parseAmount(value);
    if (!p.ok || !count) return null;
    if (kind === "same") return `${count} × ${formatAmount(p.value)} = ${formatAmount(BigInt(p.value) * BigInt(count))} ${USDC.symbol}`;
    const { each, leftover } = splitEvenly(BigInt(p.value), count);
    const rest = leftover > BigInt(0) ? ` · ${formatAmount(leftover)} not sent (rounding)` : "";
    return `${formatAmount(each)} ${USDC.symbol} each${rest}`;
  })();
  const who = scoped ? `${count} selected` : "everyone";

  const hint = error ?? preview ?? (kind === "split" ? "Divided evenly" : "Replaces their amounts");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(onApply(value));
  };
  const input = (cls: string, unit: string) => (
    <div className="relative">
      <input
        autoFocus
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          setValue(e.target.value.replace(/[^\d.,]/g, ""));
          setError(null);
        }}
        placeholder="0.00"
        aria-invalid={!!error || undefined}
        aria-label={kind === "same" ? "Amount each" : "Total to split"}
        className={cn(
          "h-9 w-36 border pr-14 pl-4 font-mono text-sm tabular outline-none transition-[border-color,box-shadow,background-color] duration-150",
          cls,
        )}
      />
      <span className={cn("pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs", unit)}>{USDC.symbol}</span>
    </div>
  );

  // Inside the selection toast: white on the toast's dark grey, the hint on its own line so the row fits.
  if (tone === "toast") {
    return (
      <form onSubmit={submit} className="flex flex-col gap-1.5 py-0.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pressable -ml-2 grid size-9 place-items-center rounded-[10px] text-white/80 hover:bg-white/15 hover:text-white"
            aria-label="Back"
          >
            {/* Back to the selection summary, not a dismiss: a chevron, not a cross. */}
            <ChevronLeftIcon className="size-4" />
          </button>
          <span className="text-[15px] font-medium whitespace-nowrap">
            {kind === "same" ? `Amount for ${pluralize(count, "person", "people")}` : `Split between ${pluralize(count, "person", "people")}`}
          </span>
          {input(
            "rounded-[10px] border-white/15 bg-white/10 text-white placeholder:text-white/50 hover:border-white/22 hover:bg-white/[0.12] focus:border-white/45 focus:bg-white/15 aria-invalid:border-[oklch(0.85_0.09_25)]",
            "text-white/70",
          )}
          <button
            type="submit"
            className="pressable ml-auto h-9 shrink-0 rounded-[10px] bg-white px-3.5 text-[14px] font-semibold whitespace-nowrap text-fg hover:bg-(--color-200)"
          >
            Apply
          </button>
        </div>
        <p className={cn("pl-9 text-[12px]", error ? "font-medium text-[oklch(0.92_0.06_25)]" : "text-white/75")}>{hint}</p>
      </form>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
      className="overflow-hidden"
      onSubmit={submit}
    >
      {/* Close leads, so the row reads dismiss → task → apply, and Apply ends it. */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-muted p-3">
        <button
          type="button"
          onClick={onClose}
          className="pressable -mr-1 grid size-8 place-items-center rounded-full text-fg-subtle hover:bg-surface hover:text-fg"
          aria-label="Close"
        >
          <CloseIcon className="size-4" />
        </button>
        <span className="text-sm font-medium">
          {kind === "same" ? `Pay ${who}` : `Split between ${who}`}
        </span>
        {/* Rest, hover, focus, error: each a visible step on the grey bar. */}
        {input(
          "rounded-full border-border bg-surface hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)] aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--danger)_18%,transparent)]",
          "text-fg-subtle",
        )}
        <span className={cn("text-[13px]", error ? "text-danger-fg" : "text-fg-muted")}>{hint}</span>
        <Button type="submit" size="sm" variant="inverse" className="ml-auto">
          Apply to {pluralize(count, "person", "people")}
        </Button>
      </div>
    </motion.form>
  );
}

// One cent in base units. Splits round down to it so nobody gets a fraction of a cent.
const CENT = BigInt(10) ** BigInt(USDC.decimals - 2);

/** Even split rounded down to the cent; `leftover` is what stays unassigned. */
function splitEvenly(total: bigint, count: number) {
  const n = BigInt(count);
  const each = (total / n / CENT) * CENT;
  return { each, leftover: total - each * n };
}

/** Summary pill for the list/pay pages: "3 need fixing". */
export function InvalidRowsBadge({ count }: { count: number }) {
  if (!count) return null;
  return <Badge tone="danger">{pluralize(count, "row needs", "rows need")} fixing</Badge>;
}
