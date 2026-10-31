"use client";

import { AnimatePresence, motion } from "motion/react";
import { Equal, FileUp, Plus, Split, Trash2, Upload, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { useRowSelection } from "@/hooks/use-row-selection";
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

const GRID =
  "md:grid-cols-[2.75rem_2rem_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_2.5rem]";

type Field = keyof RowErrors;

export function RecipientsEditor({
  rows,
  onChange,
  mode,
  showAllErrors = false,
  disabled = false,
  max = mode === "list" ? LIMITS.listRecipients : LIMITS.payoutItems,
}: {
  rows: RecipientRow[];
  onChange: (rows: RecipientRow[]) => void;
  mode: EditorMode;
  /** Set after a failed submit, so untouched fields show their errors too. */
  showAllErrors?: boolean;
  disabled?: boolean;
  max?: number;
}) {
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(PAGE);
  const [importOpen, setImportOpen] = useState(false);
  const [dropped, setDropped] = useState<ParsedImport | null>(null);
  const [bulk, setBulk] = useState<null | "same" | "split">(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { errors, duplicates, filledCount } = useMemo(() => validateRows(rows, mode), [rows, mode]);
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
  const bulkTargets = rows.filter((r) => !isBlankRow(r) && (sel.count === 0 || sel.selected.has(r.key)));

  const applyBulk = (value: string) => {
    const parsed = parseAmount(value);
    if (!parsed.ok) return parsed.error;
    if (!bulkTargets.length) return "Add people first";
    let amounts: string[];
    if (bulk === "same") {
      amounts = bulkTargets.map(() => toInputAmount(parsed.value));
    } else {
      // Split in base units; the remainder goes one unit at a time to the first rows.
      const totalUnits = BigInt(parsed.value);
      const n = BigInt(bulkTargets.length);
      const each = totalUnits / n;
      if (each === BigInt(0)) return "That total is too small to split";
      const rem = Number(totalUnits % n);
      amounts = bulkTargets.map((_, i) => toInputAmount((each + (i < rem ? BigInt(1) : BigInt(0))).toString()));
    }
    const byKey = new Map(bulkTargets.map((r, i) => [r.key, amounts[i]]));
    onChange(rows.map((r) => (byKey.has(r.key) ? { ...r, amount: byKey.get(r.key)! } : r)));
    setBulk(null);
    return null;
  };

  const shown = rows.slice(0, visible);
  const amountLabel = mode === "list" ? "Default amount" : "Amount";
  const selecting = sel.count > 0;

  return (
    <div
      ref={containerRef}
      className="flex flex-col"
      onKeyDown={(e) => {
        if (e.key === "Escape" && selecting) sel.clear();
      }}
    >
      {/* Toolbar: totals + tools, or the selection actions while rows are ticked */}
      <div className="relative min-h-12 pb-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {selecting && !disabled ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, transform: "translateY(4px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              exit={{ opacity: 0, transform: "translateY(-4px)", transition: { duration: 0.12 } }}
              transition={{ duration: 0.18 }}
              className="flex flex-wrap items-center gap-1.5 rounded-full bg-inverse py-1 pr-1 pl-4 text-inverse-fg"
            >
              <span className="mr-auto text-sm font-medium tabular">
                {pluralize(sel.count, "person", "people")} selected
                <span className="ml-2 font-normal opacity-60">
                  {formatAmount(rowsTotal(bulkTargets))} {USDC.symbol}
                </span>
              </span>
              <SelectionAction icon={<Equal />} onClick={() => setBulk(bulk === "same" ? null : "same")} active={bulk === "same"}>
                Set amount
              </SelectionAction>
              <SelectionAction icon={<Split />} onClick={() => setBulk(bulk === "split" ? null : "split")} active={bulk === "split"}>
                Split total
              </SelectionAction>
              <SelectionAction icon={<Trash2 />} onClick={removeSelected} tone="danger">
                Remove
              </SelectionAction>
              <Tooltip content="Clear selection (Esc)">
                <button
                  type="button"
                  onClick={() => sel.clear()}
                  className="pressable grid size-8 place-items-center rounded-full hover:bg-white/15"
                  aria-label="Clear selection"
                >
                  <X className="size-4" />
                </button>
              </Tooltip>
            </motion.div>
          ) : (
            <motion.div
              key="tools"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="flex flex-wrap items-center gap-2"
            >
              <div className="mr-auto flex items-baseline gap-3">
                <span className="text-sm font-medium">{pluralize(filledCount, "person", "people")}</span>
                {total > BigInt(0) && (
                  <span className="text-sm text-fg-muted tabular">
                    {formatAmount(total)} {USDC.symbol}
                  </span>
                )}
              </div>
              {!disabled && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setBulk(bulk === "same" ? null : "same")} disabled={!filledCount}>
                    <Equal className="size-4" /> Same amount
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setBulk(bulk === "split" ? null : "split")} disabled={!filledCount}>
                    <Split className="size-4" /> Split total
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                    <FileUp className="size-4" /> Import CSV
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {bulk && (
          <BulkBar
            key={`${bulk}-${selecting}`}
            kind={bulk}
            count={bulkTargets.length}
            scoped={selecting}
            onApply={applyBulk}
            onClose={() => setBulk(null)}
          />
        )}
      </AnimatePresence>

      {/* Nobody yet: make the CSV route obvious. */}
      <AnimatePresence initial={false}>
        {filledCount === 0 && !disabled && (
          <motion.button
            type="button"
            onClick={() => setImportOpen(true)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            className="group overflow-hidden text-left"
          >
            <div className="mb-4 flex items-center gap-4 rounded-2xl border-2 border-dashed border-border px-5 py-5 transition-colors duration-150 group-hover:border-border-strong group-hover:bg-surface-sunken">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-muted text-fg-muted">
                <Upload className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Drop a CSV anywhere on this page</span>
                <span className="mt-0.5 block text-[13px] text-fg-muted">
                  You&apos;ll pick who to add before anything changes. Or click to choose a file, or add people one by one below.
                </span>
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className={cn("hidden gap-px border-b border-border bg-surface-sunken text-xs font-medium text-fg-subtle md:grid", GRID)}>
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
          <span className="py-2.5 pr-2 text-right">#</span>
          <span className="px-3 py-2.5">Name</span>
          <span className="px-3 py-2.5">Email</span>
          <span className="px-3 py-2.5">Wallet address</span>
          <span className="px-3 py-2.5 text-right">
            {amountLabel} <span className="text-fg-subtle/70">({USDC.symbol})</span>
          </span>
          <span />
        </div>

        <ul className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {shown.map((r, i) => {
              const blank = isBlankRow(r);
              const checked = sel.selected.has(r.key);
              return (
                <motion.li
                  key={r.key}
                  data-row={r.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    "group grid grid-cols-[1.75rem_1fr_2.5rem] gap-x-2 gap-y-1 p-3 transition-colors duration-100 md:items-start md:gap-0 md:p-0",
                    GRID,
                    checked && "bg-primary-soft/60",
                  )}
                >
                  <span className="row-span-3 flex justify-center pt-2.5 md:row-span-1 md:pt-3.5">
                    {!disabled && !blank && (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(on, e) => sel.toggle(r.key, on, e?.shiftKey)}
                        aria-label={`Select ${r.name || `row ${i + 1}`}`}
                      />
                    )}
                  </span>
                  <span className="hidden pt-3 pr-2 text-right text-xs text-fg-subtle tabular md:block">{i + 1}</span>
                  <div className="grid grid-cols-2 gap-2 md:contents">
                    <Cell
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
                      value={r.email}
                      placeholder="Email (optional)"
                      type="email"
                      error={errorFor(r.key, "email")}
                      disabled={disabled}
                      onChange={(v) => update(r.key, "email", v)}
                      onBlur={() => touch(r.key, "email")}
                      onPaste={(e) => onPaste(e, r.key)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-start-2 md:contents">
                    <Cell
                      value={r.wallet}
                      placeholder="0x…"
                      mono
                      error={errorFor(r.key, "wallet")}
                      warning={duplicates.has(r.key) && mode === "payout" ? "Paid twice in this payment" : undefined}
                      disabled={disabled}
                      onChange={(v) => update(r.key, "wallet", v)}
                      onBlur={() => touch(r.key, "wallet")}
                      onPaste={(e) => onPaste(e, r.key)}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-start-2 md:contents">
                    <Cell
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
                    <div className="col-start-3 row-span-3 row-start-1 flex justify-end md:col-auto md:row-auto md:row-span-1 md:justify-center md:pt-1.5">
                      <Tooltip content="Remove">
                        <button
                          type="button"
                          onClick={() => removeRow(r.key)}
                          className="pressable grid size-8 place-items-center rounded-lg text-fg-subtle opacity-100 hover:bg-danger-soft hover:text-danger-fg md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                          aria-label={`Remove row ${i + 1}`}
                        >
                          <Trash2 className="size-4" />
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

        {rows.length > visible && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE * 5)}
            className="w-full border-t border-border bg-surface-sunken py-3 text-sm font-medium text-fg-muted hover:text-fg"
          >
            Show {Math.min(rows.length - visible, PAGE * 5)} more of {rows.length - visible}
          </button>
        )}

        {!disabled && (
          <button
            type="button"
            onClick={addRow}
            disabled={atLimit}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg disabled:opacity-45"
          >
            <Plus className="size-4" /> Add person
            <span className="ml-auto hidden text-xs font-normal text-fg-subtle sm:inline">
              Tip: shift-click to select a range, or paste rows from a spreadsheet
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
                <Upload className="size-6" />
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

function SelectionAction({
  icon,
  children,
  onClick,
  active,
  tone,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "pressable inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium [&_svg]:size-3.5",
        active ? "bg-white/20" : "hover:bg-white/15",
        tone === "danger" && "hover:bg-danger hover:text-white",
      )}
    >
      {icon}
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
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  warning?: string;
  mono?: boolean;
  align?: "right";
}) {
  return (
    <div className="min-w-0">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        title={error ?? warning}
        className={cn(
          "h-10 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-150",
          "md:h-11 md:rounded-none md:border-transparent md:bg-transparent",
          "hover:bg-surface-sunken focus:border-primary focus:bg-surface focus:shadow-[inset_0_0_0_1px_var(--primary)] md:focus:border-transparent",
          "placeholder:text-fg-subtle/80 disabled:cursor-default disabled:hover:bg-transparent",
          mono && "font-mono text-[13px] tabular",
          align === "right" && "md:text-right",
          error && "bg-danger-soft/60 text-danger-fg md:bg-danger-soft/50",
          className,
        )}
        {...props}
      />
      {(error || warning) && (
        <p className={cn("px-1 pt-1 pb-0.5 text-xs md:px-3 md:pt-0 md:pb-2", error ? "text-danger-fg" : "text-warning-fg")}>
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
}: {
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
    return `≈ ${formatAmount(BigInt(p.value) / BigInt(count))} ${USDC.symbol} each`;
  })();
  const who = scoped ? `${count} selected` : "everyone";

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
      className="overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        setError(onApply(value));
      }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-muted p-3">
        <span className="pl-1 text-sm font-medium">
          {kind === "same" ? `Pay ${who}` : `Split between ${who}`}
        </span>
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
            className="h-9 w-36 rounded-full border border-border bg-surface pr-14 pl-4 font-mono text-sm tabular outline-none focus:border-primary aria-invalid:border-danger"
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-fg-subtle">
            {USDC.symbol}
          </span>
        </div>
        <span className={cn("text-[13px]", error ? "text-danger-fg" : "text-fg-muted")}>
          {error ?? preview ?? (kind === "split" ? "Divided evenly" : "Replaces their amounts")}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button type="submit" size="sm" variant="inverse">
            Apply to {pluralize(count, "person", "people")}
          </Button>
          <button type="button" onClick={onClose} className="pressable grid size-8 place-items-center rounded-full text-fg-subtle hover:bg-surface hover:text-fg" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </motion.form>
  );
}

/** Summary pill for the list/pay pages: "3 need fixing". */
export function InvalidRowsBadge({ count }: { count: number }) {
  if (!count) return null;
  return <Badge tone="danger">{pluralize(count, "row needs", "rows need")} fixing</Badge>;
}
