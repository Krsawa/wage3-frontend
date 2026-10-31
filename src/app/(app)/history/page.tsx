"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Search, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Address } from "@/components/ui/address";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { PayoutStatusBadge } from "@/components/ui/status-badge";
import { useLists, useSentHistory } from "@/lib/api/queries";
import type { SentHistoryQuery, SentPayout, SentStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateTime, formatToken, pluralize } from "@/lib/format";

const PAGE_SIZE = 20;

const STATUSES: { value: "" | SentStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "submitted", label: "Sending" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially paid" },
];

const isStatus = (s: string | null): s is SentStatus =>
  s === "submitted" || s === "paid" || s === "partially_paid";

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History"
        description="Every payment you've sent from Wage3, confirmed on Base."
        actions={
          <Button asChild>
            <Link href="/pay/new">
              <Plus className="size-4" /> New payment
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TableSkeleton />}>
        <HistoryContent />
      </Suspense>
    </>
  );
}

function HistoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const search = params.get("q") ?? "";
  const statusParam = params.get("status");
  const status = isStatus(statusParam) ? statusParam : undefined;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const listId = params.get("list") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  // Caught here so the request isn't sent at all; the backend would say the same.
  const dateError = from && to && from > to ? "The start date must be on or before the end date" : null;

  const setParams = (patch: Record<string, string | undefined>, opts: { resetPage?: boolean; scroll?: boolean } = {}) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (opts.resetPage !== false && !("page" in patch)) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    if (opts.scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Search box: local state, pushed to the URL after typing pauses.
  const [searchInput, setSearchInput] = useState(search);
  const lastPushed = useRef(search);
  useEffect(() => {
    // Back/forward or "Clear filters" changed the URL: follow it.
    if (search !== lastPushed.current) {
      lastPushed.current = search;
      setSearchInput(search);
    }
  }, [search]);
  useEffect(() => {
    const value = searchInput.trim();
    if (value === lastPushed.current) return;
    const t = setTimeout(() => {
      lastPushed.current = value;
      setParams({ q: value || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useMemo<SentHistoryQuery>(
    () => ({
      search: search || undefined,
      status,
      list_id: listId || undefined,
      from: dateError ? undefined : from || undefined,
      to: dateError ? undefined : to || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [search, status, listId, from, to, page, dateError],
  );

  const history = useSentHistory(query);
  const lists = useLists();

  const hasFilters = !!(search || status || from || to || listId);
  const clearFilters = () => {
    setSearchInput("");
    lastPushed.current = "";
    router.replace(pathname, { scroll: false });
  };

  const data = history.data;
  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const refreshing = history.isFetching && history.isPlaceholderData;

  // A page past the end (e.g. after filtering in another tab): jump back to the last real page.
  useEffect(() => {
    if (pagination && page > pagination.total_pages) {
      setParams({ page: pagination.total_pages > 1 ? String(pagination.total_pages) : undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination, page]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:w-72">
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name"
            aria-label="Search payments by name"
            leading={<Search className="size-4" />}
            className="h-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Status"
            value={status ?? ""}
            onChange={(v) => setParams({ status: v || undefined })}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="List"
            value={listId}
            onChange={(v) => setParams({ list: v || undefined })}
            disabled={lists.isLoading}
          >
            <option value="">All lists</option>
            {lists.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
            {listId && lists.data && !lists.data.some((l) => l.id === listId) && (
              <option value={listId}>Deleted list</option>
            )}
          </Select>
          <div className="flex items-center gap-1.5">
            <DateInput
              aria-label="From date"
              value={from}
              max={to || undefined}
              invalid={!!dateError}
              onChange={(v) => setParams({ from: v || undefined })}
            />
            <span className="text-[13px] text-fg-subtle">to</span>
            <DateInput
              aria-label="To date"
              value={to}
              min={from || undefined}
              invalid={!!dateError}
              onChange={(v) => setParams({ to: v || undefined })}
            />
          </div>
          <AnimatePresence initial={false}>
            {hasFilters && (
              <motion.div
                initial={{ opacity: 0, transform: "scale(0.96)" }}
                animate={{ opacity: 1, transform: "scale(1)" }}
                exit={{ opacity: 0, transform: "scale(0.96)", transition: { duration: 0.12 } }}
              >
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="size-3.5" /> Clear filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {dateError && (
        <p role="alert" className="text-[13px] text-danger-fg">
          {dateError}
        </p>
      )}

      {/* Results */}
      {history.isLoading ? (
        <TableSkeleton />
      ) : history.isError && !data ? (
        <Card>
          <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState
              icon={<Search />}
              title="Nothing matches these filters"
              description="Try a different name, status or date range."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Send />}
              title="No payments yet"
              description="When you send USDC from Wage3, every payment shows up here with its on-chain receipt."
              action={
                <Button asChild>
                  <Link href="/pay/new">
                    <Plus className="size-4" /> New payment
                  </Link>
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <>
          {history.isError && (
            <ErrorState compact error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} />
          )}
          <Card className="relative overflow-hidden" aria-busy={refreshing}>
            <ProgressBar active={refreshing} />
            <div className={cn("transition-opacity duration-200", refreshing && "opacity-60")}>
              <HistoryTable items={items} />
            </div>
          </Card>
          {pagination && (
            <PaginationBar
              page={pagination.current_page}
              totalPages={pagination.total_pages}
              totalItems={pagination.total_items}
              hasPrev={pagination.has_previous_page}
              hasNext={pagination.has_next_page}
              disabled={history.isFetching}
              onPage={(p) => setParams({ page: p > 1 ? String(p) : undefined }, { scroll: true })}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---- Table ----

const COLS =
  "md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1.1fr)_minmax(0,0.6fr)_minmax(0,1.1fr)_minmax(0,1.2fr)]";

function HistoryTable({ items }: { items: SentPayout[] }) {
  return (
    <div>
      <div className={cn("hidden gap-4 border-b border-border bg-surface-sunken px-5 py-2.5 text-xs font-medium text-fg-subtle md:grid", COLS)}>
        <span>Name</span>
        <span>Status</span>
        <span className="text-right">Recipients</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Batches</span>
        <span>Sent</span>
        <span>Sender</span>
      </div>
      <ul className="divide-y divide-border">
        {items.map((p) => (
          <li key={p.id} className="relative transition-colors duration-150 hover:bg-surface-sunken">
            {/* Full-row link sits under the cells so the Address actions stay clickable. */}
            <Link href={`/pay/${p.id}`} className="absolute inset-0" aria-label={`Open ${p.name}`} />
            <div className={cn("pointer-events-none relative grid grid-cols-2 gap-x-4 gap-y-1.5 px-5 py-4 md:items-center md:gap-y-0", COLS)}>
              <span className="col-span-2 truncate text-sm font-medium md:col-span-1">{p.name}</span>
              <span className="order-last md:order-none">
                <PayoutStatusBadge status={p.status} />
              </span>
              <Cell label="Recipients" className="md:text-right">
                {(p.recipient_count ?? 0).toLocaleString("en-US")}
              </Cell>
              <Cell label="Amount" className="font-medium md:text-right">
                {formatToken(p.total_amount, p.token_symbol, p.token_decimals)}
              </Cell>
              <Cell label="Batches" className="md:text-right">
                {p.confirmed_batch_count}/{p.batch_count}
              </Cell>
              <Cell label="Sent">{formatDateTime(p.sent_at)}</Cell>
              <span className="pointer-events-auto hidden md:block">
                {p.sender_address ? <Address value={p.sender_address} /> : <span className="text-fg-subtle">—</span>}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Cell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <span className={cn("text-[13px] text-fg-muted tabular md:text-sm md:text-fg", className)}>
      <span className="text-fg-subtle md:hidden">{label}: </span>
      {children}
    </span>
  );
}

function TableSkeleton() {
  return (
    <Card className="overflow-hidden" aria-busy>
      <div className="border-b border-border bg-surface-sunken px-5 py-2.5">
        <Skeleton className="h-3 w-48" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="hidden h-4 w-28 md:block" />
        </div>
      ))}
    </Card>
  );
}

function ProgressBar({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <motion.div
            className="h-full w-1/3 bg-primary"
            initial={{ transform: "translateX(-100%)" }}
            animate={{ transform: "translateX(300%)" }}
            transition={{ duration: 1, ease: "linear", repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PaginationBar({
  page,
  totalPages,
  totalItems,
  hasPrev,
  hasNext,
  disabled,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  hasPrev: boolean;
  hasNext: boolean;
  disabled: boolean;
  onPage: (p: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-fg-muted tabular">{pluralize(totalItems, "payment")}</span>
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-fg-muted tabular">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={!hasPrev || disabled} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={!hasNext || disabled} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

// ---- Filter controls ----

function Select({
  value,
  onChange,
  children,
  className,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & { onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 max-w-52 appearance-none truncate rounded-full border border-border bg-surface pr-9 pl-4 text-sm text-fg outline-none",
          "transition-[border-color] duration-150 hover:border-border-strong focus:border-primary disabled:opacity-50",
          value && "border-border-strong font-medium",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}

function DateInput({
  value,
  onChange,
  invalid,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 rounded-full border border-border bg-surface px-3.5 font-mono text-[13px] text-fg tabular outline-none",
        "transition-[border-color] duration-150 hover:border-border-strong focus:border-primary",
        !value && "text-fg-subtle",
        "aria-invalid:border-danger",
      )}
      {...props}
    />
  );
}
