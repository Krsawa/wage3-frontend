"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { useRowSelection } from "@/hooks/use-row-selection";
import { USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { formatAmount, parseAmount, pluralize, shortAddress } from "@/lib/format";
import {
  CSV_TEMPLATE,
  parseRecipientsText,
  rowsTotal,
  validateRow,
  type EditorMode,
  type ImportResult,
  type RecipientRow,
} from "@/lib/recipients";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type ParsedImport = ImportResult & { fileName?: string };
type Parsed = ParsedImport;

/** Reads and parses a CSV/TSV/text file of recipients. Never rejects: problems come back as `error`. */
export function readRecipientsFile(file: File): Promise<ParsedImport> {
  if (file.size > MAX_FILE_BYTES) {
    return Promise.resolve({ rows: [], skipped: 0, error: "That file is over 2 MB. Is it the right one?", fileName: file.name });
  }
  return file
    .text()
    .then((text) => ({ ...parseRecipientsText(text), fileName: file.name }))
    .catch(() => ({ rows: [], skipped: 0, error: "We couldn't read that file.", fileName: file.name }));
}

/** Why a row might not be wanted. `block` rows start unselected. */
type Issue = { label: string; block: boolean };

export function ImportDialog({
  open,
  onOpenChange,
  onImport,
  hasRows,
  mode,
  existingWallets,
  room,
  dropped,
  onClearDropped,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (rows: RecipientRow[], replace: boolean) => void;
  hasRows: boolean;
  mode: EditorMode;
  /** Lowercased wallets already in the editor, to flag repeats. */
  existingWallets: Set<string>;
  /** How many more people fit (backend limit minus current). */
  room: number;
  /** A file dropped on the page, already parsed: opens straight into its preview. */
  dropped?: ParsedImport | null;
  onClearDropped?: () => void;
}) {
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Parsed | null>(null);
  const result = picked ?? dropped ?? null;
  const setResult = (r: Parsed | null) => {
    setPicked(r);
    if (dropped) onClearDropped?.();
  };
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setResult(null);
    setText("");
    setDragging(false);
  };

  const readFile = (file: File) => readRecipientsFile(file).then(setResult);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "wage3-recipients.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const hasPreview = !!result && !result.error && result.rows.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={hasPreview ? "Choose who to add" : "Import people"}
      description={
        hasPreview
          ? "Untick anyone you don't want. They're added to the bottom of the list, and you can still edit them after."
          : "Columns: name, email, wallet, amount. Only wallet is required."
      }
      className={hasPreview ? "sm:max-w-3xl" : "sm:max-w-lg"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {hasPreview ? (
          <Preview
            key={result.rows[0].key}
            result={result}
            mode={mode}
            existingWallets={existingWallets}
            room={room}
            hasRows={hasRows}
            onBack={reset}
            onConfirm={(rows, replace) => {
              onImport(rows, replace);
              close(false);
            }}
          />
        ) : (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-4 inline-flex rounded-full bg-surface-muted p-1 text-sm font-medium">
              {(["file", "paste"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative rounded-full px-3.5 py-1.5 transition-colors duration-150",
                    tab === t ? "text-fg" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {tab === t && (
                    <motion.span layoutId="import-tab" className="absolute inset-0 rounded-full bg-surface shadow-sm" transition={{ type: "spring", duration: 0.3, bounce: 0.1 }} />
                  )}
                  <span className="relative">{t === "file" ? "Upload CSV" : "Paste"}</span>
                </button>
              ))}
            </div>

            {tab === "file" ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150",
                  dragging ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong hover:bg-surface-sunken",
                )}
              >
                <span className={cn("grid size-11 place-items-center rounded-full transition-colors", dragging ? "bg-primary text-primary-fg" : "bg-surface-muted text-fg-muted")}>
                  <Upload className="size-5" />
                </span>
                <span className="mt-4 text-sm font-medium">Drop a CSV here, or click to choose</span>
                <span className="mt-1 text-[13px] text-fg-subtle">Exported from Sheets, Excel or Notion</span>
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setResult(parseRecipientsText(text));
                }}
              >
                <Textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"Ada, ada@example.com, 0x1234…, 250\nGrace, 0xabcd…, 100"}
                  className="min-h-40 font-mono text-[13px]"
                  spellCheck={false}
                />
                <Button type="submit" variant="inverse" className="mt-3 w-full" disabled={!text.trim()}>
                  Preview
                </Button>
              </form>
            )}

            {result?.error && (
              <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger-fg">
                {result.fileName && <strong className="font-medium">{result.fileName}: </strong>}
                {result.error}
              </p>
            )}

            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted hover:text-fg"
            >
              <Download className="size-3.5" /> Download a template
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain,.tsv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
                e.target.value = "";
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

function Preview({
  result,
  mode,
  existingWallets,
  room,
  hasRows,
  onBack,
  onConfirm,
}: {
  result: Parsed;
  mode: EditorMode;
  existingWallets: Set<string>;
  room: number;
  hasRows: boolean;
  onBack: () => void;
  onConfirm: (rows: RecipientRow[], replace: boolean) => void;
}) {
  const { rows } = result;

  // One pass: what's wrong with each row, if anything.
  const issues = useMemo(() => {
    const map = new Map<string, Issue>();
    const seen = new Set<string>();
    for (const r of rows) {
      const w = r.wallet.trim().toLowerCase();
      const errors = validateRow(r, mode);
      const first = errors.wallet ?? errors.amount ?? errors.email ?? errors.name;
      if (w && existingWallets.has(w)) {
        map.set(r.key, { label: mode === "list" ? "Already in this list" : "Already in this payment", block: mode === "list" });
      } else if (w && seen.has(w)) {
        map.set(r.key, { label: "Repeated in this file", block: mode === "list" });
      } else if (first) {
        map.set(r.key, { label: first, block: false });
      }
      if (w) seen.add(w);
    }
    return map;
  }, [rows, mode, existingWallets]);

  const keys = useMemo(() => rows.map((r) => r.key), [rows]);
  const sel = useRowSelection(keys, () => keys.filter((k) => !issues.get(k)?.block));
  const chosen = rows.filter((r) => sel.selected.has(r.key));
  const total = rowsTotal(chosen);
  const problemKeys = keys.filter((k) => issues.has(k) && sel.selected.has(k));
  const overBy = chosen.length - room;

  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(4px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      exit={{ opacity: 0 }}
      className="flex flex-col"
    >
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3">
        <FileSpreadsheet className="size-5 shrink-0 text-fg-muted" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{result.fileName ?? "Pasted text"}</div>
          <div className="text-[13px] text-fg-muted">
            {pluralize(rows.length, "row")} found
            {result.skipped > 0 && ` · ${result.skipped} empty skipped`}
          </div>
        </div>
        {problemKeys.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => sel.replace([...sel.selected].filter((k) => !issues.has(k)))}>
            Untick {pluralize(problemKeys.length, "row")} with problems
          </Button>
        )}
      </div>

      <div className="mt-4 max-h-[min(24rem,50dvh)] overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface-sunken text-left text-xs text-fg-subtle">
            <tr>
              <th className="w-10 py-2.5 pl-3.5">
                <Checkbox
                  checked={sel.isAll}
                  indeterminate={sel.isSome}
                  onCheckedChange={(on) => sel.setAll(on)}
                  aria-label="Select all rows"
                />
              </th>
              <th className="px-2 py-2.5 font-medium">Name</th>
              <th className="px-2 py-2.5 font-medium">Wallet</th>
              <th className="px-2 py-2.5 text-right font-medium">Amount</th>
              <th className="py-2.5 pr-3.5 pl-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const issue = issues.get(r.key);
              const on = sel.selected.has(r.key);
              const amount = r.amount ? parseAmount(r.amount) : null;
              return (
                <tr
                  key={r.key}
                  onClick={(e) => sel.toggle(r.key, !on, e.shiftKey)}
                  className={cn(
                    "cursor-pointer transition-colors duration-100 select-none",
                    on ? "hover:bg-surface-sunken" : "text-fg-subtle hover:bg-surface-sunken",
                  )}
                >
                  <td className="py-2.5 pl-3.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={on}
                      onCheckedChange={(v, e) => sel.toggle(r.key, v, e?.shiftKey)}
                      aria-label={`Include ${r.name || r.wallet || "row"}`}
                    />
                  </td>
                  <td className="max-w-44 truncate px-2 py-2.5">
                    {r.name || <span className="text-fg-subtle">No name</span>}
                    {r.email && <div className="truncate text-xs text-fg-subtle">{r.email}</div>}
                  </td>
                  <td className="px-2 py-2.5 font-mono" title={r.wallet}>
                    {r.wallet ? shortAddress(r.wallet, 5) : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular">
                    {amount?.ok ? formatAmount(amount.value) : r.amount || "—"}
                  </td>
                  <td className="py-2.5 pr-3.5 pl-2 text-right">
                    {issue && (
                      <Badge tone={issue.block ? "neutral" : "warning"} className="max-w-48 truncate">
                        {issue.label}
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence initial={false}>
        {overBy > 0 && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <span className="mt-3 block rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning-fg">
              Only {room.toLocaleString()} more fit. Untick {pluralize(overBy, "person", "people")}, or replace everyone instead.
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <Button variant="ghost" onClick={onBack}>
          Choose another file
        </Button>
        <span className="text-[13px] text-fg-muted tabular sm:ml-auto">
          {chosen.length} of {rows.length} selected
          {total > BigInt(0) && ` · ${formatAmount(total)} ${USDC.symbol}`}
        </span>
        {hasRows && (
          <Button variant="outline" disabled={!chosen.length} onClick={() => onConfirm(chosen, true)}>
            Replace everyone
          </Button>
        )}
        <Button variant="inverse" disabled={!chosen.length || overBy > 0} onClick={() => onConfirm(chosen, false)}>
          Add {pluralize(chosen.length, "person", "people")}
        </Button>
      </div>
    </motion.div>
  );
}
