"use client";

import { AnimatePresence, motion } from "motion/react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Address } from "@/components/ui/address";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, CalendarFooter, formatYmd, type YmdRange } from "@/components/ui/date-picker";
import {
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownSeparator,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { ChevronLeftIcon, ChevronRightIcon, FiltersIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, IllustratedEmpty } from "@/components/ui/states";
import { PayoutStatusBadge } from "@/components/ui/status-badge";
import { useLists, useSentHistory } from "@/lib/api/queries";
import type { SentHistoryQuery, SentPayout, SentStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateTime, formatToken, pluralize, toApiDate } from "@/lib/format";
import { SLIDE } from "@/lib/motion";
import { DISPLAY_TEXT } from "@/lib/type";

const PAGE_SIZE = 20;

const STATUSES: { value: "" | SentStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "submitted", label: "In progress" },
  { value: "paid", label: "Done" },
  { value: "partially_paid", label: "Needs attention" },
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
          <Button asChild variant="inverse" className="h-9">
            <Link href="/pay/new">
              <PlusIcon className="size-4" /> New payment
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
    // The page scrolls inside the app panel, not the window (see (app)/layout.tsx).
    if (opts.scroll) document.getElementById("app-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
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
      {/* Tabs on the left, filters at the end, on one line. The filter group repeats the tabs'
          12px bottom padding so both centre on the same line. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <StatusTabs value={status} onChange={(v) => setParams({ status: v })} />

        {/* Filters */}
        <div className="flex items-center gap-2 md:pb-3">
          {/* The top bar's search, as designed: grey pill, no border, blue ring on focus. */}
          <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search payments"
              aria-label="Search payments by name"
              className="h-10 w-full rounded-full bg-surface-muted pr-4 pl-10 text-sm outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-fg-subtle focus:bg-surface focus:shadow-[0_0_0_2px_var(--primary)]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FiltersMenu
              lists={lists.data ?? []}
              listId={listId}
              from={from}
              to={to}
              onList={(id) => setParams({ list: id || undefined })}
              onTime={(range) => setParams({ from: range.from || undefined, to: range.to || undefined })}
              onReset={() => setParams({ list: undefined, from: undefined, to: undefined })}
            />
          </div>
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
              icon={<SearchIcon />}
              title="Nothing matches these filters"
              description="Try a different name, status or date range."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <FirstPaymentEmpty />
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

// ---- Filters menu ----

const TIME_PRESETS = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
] as const;

/** UTC day `n` days back, matching the backend's day boundaries. */
const daysAgo = (n: number) => toApiDate(new Date(Date.now() - n * 86_400_000));

/** Which preset a from/to pair is, if any ("Last 30 days" = from 29 days ago, no end). */
function presetFor(from: string, to: string) {
  if (!from || to) return null;
  return TIME_PRESETS.find((p) => from === daysAgo(p.days - 1)) ?? null;
}

/**
 * Filters collapsed behind one button. List and Time each open a secondary menu; a count on
 * the button says how many are active. Reset clears both (search has its own clear).
 */
function FiltersMenu({
  lists,
  listId,
  from,
  to,
  onList,
  onTime,
  onReset,
}: {
  lists: { id: string; name: string }[];
  listId: string;
  from: string;
  to: string;
  onList: (id: string) => void;
  onTime: (range: YmdRange) => void;
  onReset: () => void;
}) {
  const preset = presetFor(from, to);
  const time = (from || to) && !preset ? "custom" : (preset?.id ?? "all");
  // Open by default when a custom range is already set, so it's visible where it lives.
  const [customOpen, setCustomOpen] = useState(time === "custom");
  const active = (listId ? 1 : 0) + (from || to ? 1 : 0);
  // Short (no year) so it fits the menu's hint column.
  const short = (v: string) => formatYmd(v).replace(/ \d{4}$/, "");
  const rangeName = from || to ? `${from ? short(from) : "…"} – ${to ? short(to) : "…"}` : "";
  const listName = listId ? (lists.find((l) => l.id === listId)?.name ?? "Deleted list") : "All lists";
  const timeName = time === "custom" ? rangeName : (preset?.label ?? "All time");

  return (
    <DropdownMenu>
      <Tooltip content="Filters">
        <DropdownTrigger asChild>
          {/* The count sits inside the button beside the icon, not hanging off its corner. */}
          <Button
            variant="outline"
            aria-label={active ? `Filters, ${active} active` : "Filters"}
            className={cn(
              "h-10 shrink-0 gap-1.5 rounded-full",
              active > 0 ? "px-3" : "w-10 p-0",
            )}
          >
            <FiltersIcon className="size-4" />
            {active > 0 && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-inverse px-1 text-[11px] font-medium text-inverse-fg tabular">
                {active}
              </span>
            )}
          </Button>
        </DropdownTrigger>
      </Tooltip>
      <DropdownContent className="w-64">
        <DropdownLabel
          action={
            active > 0 && (
              <button type="button" onClick={onReset}>
                Reset
              </button>
            )
          }
        >
          Filters
        </DropdownLabel>

        <DropdownSub>
          <DropdownSubTrigger hint={listName}>List</DropdownSubTrigger>
          <DropdownSubContent className="max-h-80 w-56 overflow-y-auto">
            <DropdownRadioGroup value={listId} onValueChange={onList}>
              <DropdownRadioItem value="">All lists</DropdownRadioItem>
              {lists.map((l) => (
                <DropdownRadioItem key={l.id} value={l.id}>
                  {l.name}
                </DropdownRadioItem>
              ))}
              {listId && !lists.some((l) => l.id === listId) && (
                <DropdownRadioItem value={listId}>Deleted list</DropdownRadioItem>
              )}
            </DropdownRadioGroup>
          </DropdownSubContent>
        </DropdownSub>

        <DropdownSub>
          <DropdownSubTrigger hint={timeName}>Time</DropdownSubTrigger>
          <DropdownSubContent className={customOpen ? "w-[266px]" : "w-56"}>
            <DropdownRadioGroup
              value={time}
              onValueChange={(v) =>
                onTime(
                  v === "all"
                    ? { from: "", to: "" }
                    : { from: daysAgo(TIME_PRESETS.find((p) => p.id === v)!.days - 1), to: "" },
                )
              }
            >
              <DropdownRadioItem value="all">All time</DropdownRadioItem>
              {TIME_PRESETS.map((p) => (
                <DropdownRadioItem key={p.id} value={p.id}>
                  {p.label}
                </DropdownRadioItem>
              ))}
            </DropdownRadioGroup>
            <DropdownSeparator />
            {/* Custom range expands the calendar in place, inside this submenu, instead of a
                third flyout that could open off to the side, far from what was clicked. */}
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setCustomOpen((o) => !o);
              }}
              aria-expanded={customOpen}
            >
              <span className="flex-1">Custom range</span>
              {time === "custom" && <span className="text-[13px] text-fg-subtle">{rangeName}</span>}
              <ChevronRightIcon className={cn("size-4 text-fg-subtle transition-transform duration-150", customOpen && "rotate-90")} />
            </DropdownItem>
            {customOpen && (
              <div className="w-[256px] px-px">
                <Calendar
                  mode="range"
                  value={time === "custom" ? { from, to } : { from: "", to: "" }}
                  onSelect={onTime}
                />
                <CalendarFooter>
                  <span className="text-fg-subtle">{to ? "Range set" : from ? "Now pick an end date" : "Pick a start date"}</span>
                  <button
                    type="button"
                    disabled={!from && !to}
                    onClick={() => onTime({ from: "", to: "" })}
                    className="text-fg-subtle hover:text-fg disabled:opacity-35"
                  >
                    Clear
                  </button>
                </CalendarFooter>
              </div>
            )}
          </DropdownSubContent>
        </DropdownSub>
      </DropdownContent>
    </DropdownMenu>
  );
}

// ---- Status tabs ----

/** Underlined tabs; the underline slides to the active status. */
function StatusTabs({ value, onChange }: { value: SentStatus | undefined; onChange: (v: SentStatus | undefined) => void }) {
  return (
    <div role="tablist" aria-label="Status" className="flex w-fit max-w-full gap-6 self-start overflow-x-auto">
      {STATUSES.map((t) => {
        const on = (value ?? "") === t.value;
        return (
          <button
            key={t.value || "all"}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value || undefined)}
            className={cn(
              // Inter Display at one weight for every tab, so the sliding underline never jumps.
              DISPLAY_TEXT,
              "relative pb-3 text-[15px] font-medium whitespace-nowrap transition-colors duration-150",
              on ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
            {on && (
              <motion.span
                layoutId="history-tab"
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-fg"
                transition={SLIDE}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---- Empty state ----

/** No payments yet. */
function FirstPaymentEmpty() {
  return (
    <IllustratedEmpty
      title="Send your first payment"
      description="Pay your whole team in USDC on Base. Every payment lands here with its on-chain receipt."
      actions={
        <>
          <Button asChild variant="inverse">
            <Link href="/pay/new">
              <PlusIcon className="size-4" /> New payment
            </Link>
          </Button>
          <Link href="/#how" className="text-sm font-medium text-fg-muted hover:text-fg">
            How it works
          </Link>
        </>
      }
    />
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
          <li key={p.id} className="relative transition-colors duration-150 hover:bg-surface-hover">
            {/* Full-row link sits under the cells so the Address actions stay clickable. */}
            <Link href={`/pay/${p.id}`} className="absolute inset-0" aria-label={`Open ${p.name}`} />
            <div className={cn("pointer-events-none relative grid grid-cols-2 gap-x-4 gap-y-1.5 px-5 py-4 md:items-center md:gap-y-0", COLS)}>
              <span className="col-span-2 truncate text-sm font-medium md:col-span-1">{p.name}</span>
              <span className="order-last md:order-none">
                <PayoutStatusBadge status={p.status} grouped />
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
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={!hasNext || disabled} onClick={() => onPage(page + 1)}>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

// ---- Filter controls ----

