"use client";

import { motion } from "motion/react";
import { Info } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useConnection } from "wagmi";

import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { PayoutStatusBadge } from "@/components/ui/status-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { useUsdcBalance } from "@/components/wallet/wallet-button";
import { ListCard } from "@/components/lists/list-card";
import { NewPaymentButton } from "@/components/shell/app-nav";
import { ArrowRightIcon, ImportIcon, PlusIcon, SendIcon, WalletIcon } from "@/components/ui/icons";
import { useLists, useMe, useSentHistory, useStats } from "@/lib/api/queries";
import type { Stats } from "@/lib/api/types";
import { useSession } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";
import { USDC } from "@/lib/config";
import { formatAmount, formatDate, formatFigure, formatRelative, formatToken, pluralize, shortAddress, toApiDate } from "@/lib/format";
import { DISPLAY_FIGURE } from "@/lib/type";
import { SLIDE } from "@/lib/motion";

const RANGES = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "all", label: "All", days: null },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

const PERIOD: Record<RangeId, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "All time" };

/** UTC day `n` days back, for the stats `from` param (inclusive). */
function daysAgo(n: number) {
  return toApiDate(new Date(Date.now() - n * 86_400_000));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user: sessionUser } = useSession();
  const { data: me } = useMe();
  const user = me ?? sessionUser;
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || user?.email.split("@")[0] || "";

  // Same query keys as the sections below, so these come from the cache.
  const history = useSentHistory({ limit: 5 });
  const lists = useLists();
  const firstRun = history.isSuccess && history.data.items.length === 0;
  const hasLists = (lists.data?.length ?? 0) > 0;

  // Dashboard order: greeting, the start-a-payment action, overview, then the sections. Returning senders mostly
  // repeat a list, so lists lead once they exist; a first-time sender sees one action.
  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Send payments to your team in one go."
      />

      {/* The main action on its own line, in its own container, apart from the greeting. */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-(--color-25) p-5 shadow-(--shadow-xs) sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium tracking-[-0.006em]">Start a payment</h2>
          <p className="mt-0.5 text-[13px] text-fg-muted text-pretty">Paste wallets, import a CSV or start from a saved list.</p>
        </div>
        <NewPaymentButton className="h-10 shrink-0 self-start px-4 text-sm sm:self-auto" />
      </div>

      <AttentionBanner />
      <StatsSection />

      {firstRun ? (
        <Section title="Get started">
          <FirstRun />
        </Section>
      ) : (
        <>
          <Section
            title="Your lists"
            action={
              hasLists && (
                <Link href="/lists" className="text-[13px] font-medium text-fg-muted underline decoration-(--color-800) decoration-dotted decoration-1 underline-offset-4 hover:decoration-fg hover:text-fg">
                  All lists
                </Link>
              )
            }
          >
            <ListsGrid />
          </Section>
          <Section title="Recent payments">
            <RecentPayments />
          </Section>
        </>
      )}
    </>
  );
}

function Section({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mt-8 border-t border-[oklch(0_0_0/0.08)]", className)} aria-label={title}>
      {/* 32px of content above the rule, 24px from the rule to the heading, 24px to the content. */}
      <div className="flex items-end justify-between gap-4 pt-6 pb-6">
        <h2 className="text-sm font-medium tracking-[-0.006em] text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AttentionBanner() {
  const attention = useSentHistory({ status: "partially_paid", limit: 1 });
  const count = attention.data?.pagination.total_items ?? 0;
  if (!count) return null;
  return (
    <Link
      href={count === 1 ? `/pay/${attention.data!.items[0].id}` : "/history?status=partially_paid"}
      className="mb-6 flex items-center gap-3 rounded-2xl bg-warning-soft px-5 py-3.5 text-sm text-warning-fg transition-opacity duration-150 hover:opacity-90"
    >
      <span className="flex-1">
        {count === 1
          ? `“${attention.data!.items[0].name}” needs attention: some people weren't paid.`
          : `${pluralize(count, "payment needs", "payments need")} attention: some people weren't paid.`}
      </span>
      <ArrowRightIcon className="size-4" />
    </Link>
  );
}

// ---- Stats ----

function StatsSection() {
  const [range, setRange] = useState<RangeId>("30d");

  const query = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!;
    if (!r.days) return undefined;
    return { from: daysAgo(r.days - 1) };
  }, [range]);

  const stats = useStats(query);
  const switching = stats.isPlaceholderData && stats.isFetching;

  return (
    // A hairline opens each section on Home: translucent black (oklch 0 0 0 / 8%), per the refined
    // design system, so it's lighter than card and table edges and right on any surface.
    <section aria-labelledby="stats-heading" className="border-t border-[oklch(0_0_0/0.08)]">
      {/* Rhythm (refined design system): 24px from the rule to the heading text, 24px to the content.
          The 36px range control is taller than the heading, so 16px padding lands the text on 24. */}
      <div className="flex items-center justify-between gap-4 pt-4 pb-4">
        <h2 id="stats-heading" className="text-sm font-medium tracking-[-0.006em] text-fg">
          Overview
        </h2>
        <RangeControl value={range} onChange={setRange} />
      </div>

      {stats.isError && !stats.data ? (
        <ErrorState compact error={stats.error} onRetry={() => stats.refetch()} retrying={stats.isFetching} />
      ) : (
        // An open strip like Aave's market stats: no cards, hairlines between figures.
        <div
          className={cn(
            "grid grid-cols-2 gap-x-4 gap-y-6 py-2 transition-opacity duration-200 lg:flex lg:gap-0",
            switching && "opacity-60",
          )}
          aria-busy={switching || stats.isLoading}
        >
          <TotalSentStat stats={stats.data} loading={stats.isLoading} />
          <Stat
            label="Payments sent"
            info="Payments you sent in this period, counted once each however many batches they took."
            loading={stats.isLoading}
          >
            {stats.data?.payouts_sent.toLocaleString("en-US")}
          </Stat>
          <Stat
            label="Wallets paid"
            info="Different wallets that received USDC from you in this period."
            loading={stats.isLoading}
          >
            {stats.data?.wallets_paid.toLocaleString("en-US")}
          </Stat>
          <Stat
            label="Last payment"
            info="When your most recent payment was sent."
            loading={stats.isLoading}
            sub={stats.data?.last_sent_at ? formatDate(stats.data.last_sent_at) : "Nothing sent yet"}
          >
            {stats.data ? (stats.data.last_sent_at ? formatRelative(stats.data.last_sent_at) : "-") : undefined}
          </Stat>
          <BalanceStat />
        </div>
      )}
    </section>
  );
}

function RangeControl({ value, onChange }: { value: RangeId; onChange: (v: RangeId) => void }) {
  return (
    // Oklch greys, loudest step on the selection: track --color-400 (0.966) with a subtle
    // --color-50 (0.95) edge, the chosen range a white pill lifted by the layered shadow.
    // Fully round; 1px border + 1px padding around 32px pills keeps it exactly 36px tall.
    <div role="radiogroup" aria-label="Time range" className="inline-flex h-9 items-center rounded-full border border-(--color-50) bg-(--color-400) p-px text-[13px] font-medium">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          role="radio"
          aria-checked={value === r.id}
          // "7D" reads badly aloud; the period's full name doesn't.
          aria-label={PERIOD[r.id]}
          onClick={() => onChange(r.id)}
          className={cn(
            "relative flex h-8 items-center rounded-full px-3 transition-colors duration-150",
            value === r.id ? "text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {value === r.id && (
            <motion.span
              layoutId="stats-range"
              className="absolute inset-0 rounded-full bg-surface shadow-(--shadow-xs)"
              transition={SLIDE}
            />
          )}
          <span className="relative tabular">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

/** One figure in the strip: label with an explainer, the value, and a quiet line under it. */
function Stat({
  label,
  info,
  sub,
  loading,
  children,
}: {
  label: string;
  info: string;
  sub?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 lg:shrink-0 lg:border-l lg:border-[oklch(0_0_0/0.08)] lg:px-8 lg:first:border-l-0 lg:first:pl-0">
      {/* Label regular weight so the figure carries the hierarchy (refined design system). */}
      <div className="flex items-center gap-1.5 text-[13px] text-fg-muted">
        {label}
        <Tooltip content={info}>
          <button type="button" aria-label={`About ${label.toLowerCase()}`} className="grid size-4 place-items-center rounded-full text-fg-subtle hover:text-fg">
            <Info className="size-3.5" />
          </button>
        </Tooltip>
      </div>
      {loading || children === undefined ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        // An empty figure ("-") is grey, so it reads as "nothing yet" rather than a value.
        <div className={cn(DISPLAY_FIGURE, "text-[28px] whitespace-nowrap", children === "-" && "text-fg-subtle")}>{children}</div>
      )}
      {sub && <div className="truncate text-[13px] text-fg-subtle tabular">{sub}</div>}
    </div>
  );
}

function TotalSentStat({ stats, loading }: { stats?: Stats; loading: boolean }) {
  const totals = stats?.total_sent ?? [];
  const usdc = totals.find((t) => t.token_address.toLowerCase() === USDC.address.toLowerCase());
  const primary = usdc ?? totals[0];
  const others = totals.filter((t) => t !== primary);
  return (
    <Stat
      label="Total sent"
      info="USDC you sent in this period that has confirmed on Base."
      loading={loading || !stats}
      // The range control already names the period, so it isn't repeated under each figure.
      sub={others.length ? `+ ${others.map((t) => formatToken(t.amount, t.token_symbol, t.token_decimals)).join(", ")}` : undefined}
    >
      <>
        <span title={formatAmount(primary?.amount ?? "0", primary?.token_decimals ?? USDC.decimals, { maxFraction: 2 })}>
          {formatFigure(primary?.amount ?? "0", primary?.token_decimals ?? USDC.decimals)}
        </span>
        <span className="ml-1.5 font-sans text-sm font-normal tracking-normal text-fg-muted">{primary?.token_symbol ?? USDC.symbol}</span>
      </>
    </Stat>
  );
}

function BalanceStat() {
  const { isConnected, address } = useConnection();
  const balance = useUsdcBalance();
  return (
    <Stat
      label="Wallet balance"
      info="USDC in your connected wallet on Base. Wage3 never holds your funds."
      loading={isConnected && balance.isLoading}
      sub={isConnected ? shortAddress(address) : "Connect a wallet to see it"}
    >
      {!isConnected ? (
        "-"
      ) : balance.isError ? (
        <span className="text-[15px] text-danger-fg">Couldn&apos;t read it</span>
      ) : (
        <>
          {formatAmount(balance.data ?? BigInt(0), USDC.decimals, { maxFraction: 2 })}
          <span className="ml-1.5 font-sans text-sm font-normal tracking-normal text-fg-muted">{USDC.symbol}</span>
        </>
      )}
    </Stat>
  );
}

// ---- Recent payments ----

function RecentPayments() {
  const history = useSentHistory({ limit: 5 });
  const items = history.data?.items ?? [];

  // An error stands on its own like the other sections', not boxed inside the card.
  if (history.isError) {
    return <ErrorState compact error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} />;
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {history.isLoading ? (
        <CardBody className="flex flex-col gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardBody>
      ) : items.length === 0 ? (
        <FirstRun />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pay/${p.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-surface-hover"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-fg-subtle">
                    {pluralize(p.recipient_count ?? 0, "recipient")} · {formatRelative(p.sent_at ?? p.created_at)}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium tabular">
                    {formatToken(p.total_amount, p.token_symbol, p.token_decimals)}
                  </span>
                  <PayoutStatusBadge status={p.status} grouped />
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/history"
              className="flex items-center justify-center py-3 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
            >
              <span className="underline decoration-(--color-800) decoration-dotted decoration-1 underline-offset-4">View all payments</span>
            </Link>
          </li>
        </ul>
      )}
    </Card>
  );
}

const STEPS = [
  { icon: ImportIcon, title: "Add your people", body: "Paste wallets or import a CSV." },
  { icon: WalletIcon, title: "Connect a wallet", body: "Base Account or any browser wallet." },
  { icon: SendIcon, title: "Send in one go", body: "Up to 1,000 wallets, batched on Base." },
];

/** The three steps to a first payment, as plain cards (no done states). */
function FirstRun() {
  return (
    <div>
      {/* Same grid as the stat tiles: each step is one tile wide, the rest stays empty. */}
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, transform: "translateY(6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ delay: 0.05 + i * 0.05, duration: 0.24 }}
            className="flex h-28 flex-col gap-2 rounded-2xl bg-(--color-25) p-4 shadow-(--shadow-xs) sm:p-5"
          >
            {/* Icon + title on top, detail directly under it, in the oklch greys. */}
            <div className="flex items-center gap-2">
              <s.icon className="size-5 shrink-0 text-(--color-800)" />
              <h3 className="truncate text-[16px] font-medium tracking-[-0.01em] text-(--color-950)">{s.title}</h3>
            </div>
            <p className="line-clamp-2 text-[13px] leading-5 text-(--color-900) text-pretty">{s.body}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

// ---- Lists ----

/** Saved lists as cards, the way a dashboard groups its main objects. */
function ListsGrid() {
  const lists = useLists();
  const items = (lists.data ?? []).slice(0, 6);

  if (lists.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (lists.isError) {
    return <ErrorState compact error={lists.error} onRetry={() => lists.refetch()} retrying={lists.isFetching} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((l, i) => (
        <motion.div
          key={l.id}
          initial={{ opacity: 0, transform: "translateY(6px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ delay: i * 0.03, duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          <ListCard list={l} />
        </motion.div>
      ))}

      <Link
        href="/lists"
        className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-5 text-center text-fg-muted transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover hover:text-fg"
      >
        <PlusIcon className="size-5" />
        <span className="text-sm font-medium">{items.length ? "New list" : "Create your first list"}</span>
        {!items.length && (
          <span className="max-w-60 text-[13px] text-fg-subtle text-pretty">
            Save the people you pay often and pay them again in two clicks.
          </span>
        )}
      </Link>
    </div>
  );
}
