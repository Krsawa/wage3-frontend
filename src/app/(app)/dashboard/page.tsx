"use client";

import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, ListChecks, Plus, Send, Upload, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useConnection } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { PayoutStatusBadge } from "@/components/ui/status-badge";
import { useUsdcBalance } from "@/components/wallet/wallet-button";
import { useLists, useMe, useSentHistory, useStats } from "@/lib/api/queries";
import type { Stats } from "@/lib/api/types";
import { useSession } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";
import { USDC } from "@/lib/config";
import { formatAmount, formatDate, formatRelative, formatToken, pluralize, toApiDate } from "@/lib/format";

const RANGES = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "all", label: "All", days: null },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

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

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Send USDC to your team, contributors or community in one go. Settled on Base in seconds."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/lists">
                <ListChecks className="size-4" /> Pay a list
              </Link>
            </Button>
            <Button asChild>
              <Link href="/pay/new">
                <Plus className="size-4" /> New payment
              </Link>
            </Button>
          </>
        }
      />

      <StatsSection />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <RecentPayments />
        <YourLists />
      </div>
    </>
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
    <section aria-labelledby="stats-heading">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="stats-heading" className="text-sm font-medium text-fg-muted">
          Overview
        </h2>
        <RangeControl value={range} onChange={setRange} />
      </div>

      {stats.isError && !stats.data ? (
        <ErrorState compact error={stats.error} onRetry={() => stats.refetch()} retrying={stats.isFetching} />
      ) : (
        <div
          className={cn(
            "grid grid-cols-2 gap-3 transition-opacity duration-200 lg:grid-cols-5",
            switching && "opacity-60",
          )}
          aria-busy={switching || stats.isLoading}
        >
          <TotalSentTile stats={stats.data} loading={stats.isLoading} />
          <StatTile
            label="Payments sent"
            loading={stats.isLoading}
            value={stats.data?.payouts_sent.toLocaleString("en-US")}
          />
          <StatTile
            label="Wallets paid"
            loading={stats.isLoading}
            value={stats.data?.wallets_paid.toLocaleString("en-US")}
          />
          <StatTile
            label="Last payment"
            loading={stats.isLoading}
            value={stats.data ? (stats.data.last_sent_at ? formatRelative(stats.data.last_sent_at) : "Never") : undefined}
            hint={stats.data?.last_sent_at ? formatDate(stats.data.last_sent_at) : undefined}
            small
          />
          <BalanceTile />
        </div>
      )}
    </section>
  );
}

function RangeControl({ value, onChange }: { value: RangeId; onChange: (v: RangeId) => void }) {
  return (
    <div role="radiogroup" aria-label="Time range" className="inline-flex rounded-full bg-surface-muted p-0.5 text-[13px] font-medium">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          role="radio"
          aria-checked={value === r.id}
          onClick={() => onChange(r.id)}
          className={cn(
            "relative rounded-full px-3 py-1 transition-colors duration-150",
            value === r.id ? "text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {value === r.id && (
            <motion.span
              layoutId="stats-range"
              className="absolute inset-0 rounded-full bg-surface shadow-sm"
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            />
          )}
          <span className="relative tabular">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

function TileShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cn("flex min-h-28 flex-col justify-between p-4 sm:p-5", className)}>{children}</Card>;
}

function StatTile({
  label,
  value,
  hint,
  loading,
  small,
}: {
  label: string;
  value?: string;
  hint?: string;
  loading?: boolean;
  small?: boolean;
}) {
  return (
    <TileShell>
      <div className="text-[13px] text-fg-muted">{label}</div>
      {loading || value === undefined ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <div>
          <div className={cn("mt-3 font-medium tracking-[-0.03em] tabular", small ? "text-xl" : "text-[28px] leading-none")}>
            {value}
          </div>
          {hint && <div className="mt-1 text-xs text-fg-subtle">{hint}</div>}
        </div>
      )}
    </TileShell>
  );
}

function TotalSentTile({ stats, loading }: { stats?: Stats; loading: boolean }) {
  const totals = stats?.total_sent ?? [];
  const usdc = totals.find((t) => t.token_address.toLowerCase() === USDC.address.toLowerCase());
  const primary = usdc ?? totals[0];
  const others = totals.filter((t) => t !== primary);

  return (
    <TileShell className="col-span-2 lg:col-span-1">
      <div className="text-[13px] text-fg-muted">Total sent</div>
      {loading || !stats ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[28px] leading-none font-medium tracking-[-0.03em] tabular">
              {formatAmount(primary?.amount ?? "0", primary?.token_decimals ?? USDC.decimals, { maxFraction: 2 })}
            </span>
            <span className="text-sm text-fg-muted">{primary?.token_symbol ?? USDC.symbol}</span>
          </div>
          {others.map((t) => (
            <div key={t.token_address} className="mt-1 text-xs text-fg-subtle tabular">
              + {formatToken(t.amount, t.token_symbol, t.token_decimals)}
            </div>
          ))}
        </div>
      )}
    </TileShell>
  );
}

function BalanceTile() {
  const { isConnected } = useConnection();
  const balance = useUsdcBalance();

  if (!isConnected) {
    return (
      <TileShell className="col-span-2 border-dashed lg:col-span-1">
        <div className="flex items-center gap-1.5 text-[13px] text-fg-muted">
          <Wallet className="size-3.5" /> Wallet balance
        </div>
        <p className="mt-3 text-[13px] text-fg-subtle text-pretty">
          Connect a wallet to see your balance.
        </p>
      </TileShell>
    );
  }

  return (
    <TileShell className="col-span-2 lg:col-span-1">
      <div className="flex items-center gap-1.5 text-[13px] text-fg-muted">
        <Wallet className="size-3.5" /> Wallet balance
      </div>
      {balance.isLoading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : balance.isError ? (
        <p className="mt-3 text-[13px] text-danger-fg">Couldn&apos;t read your balance</p>
      ) : (
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-[28px] leading-none font-medium tracking-[-0.03em] tabular">
            {formatAmount(balance.data ?? BigInt(0), USDC.decimals, { maxFraction: 2 })}
          </span>
          <span className="text-sm text-fg-muted">{USDC.symbol}</span>
        </div>
      )}
    </TileShell>
  );
}

// ---- Recent payments ----

function RecentPayments() {
  const history = useSentHistory({ limit: 5 });
  const lists = useLists();
  const items = history.data?.items ?? [];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Recent payments</CardTitle>
        {items.length > 0 && (
          <Link href="/history" className="inline-flex items-center gap-1 text-[13px] font-medium text-fg-muted hover:text-fg">
            View all <ArrowRight className="size-3.5" />
          </Link>
        )}
      </CardHeader>

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
      ) : history.isError ? (
        <CardBody>
          <ErrorState compact error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} />
        </CardBody>
      ) : items.length === 0 ? (
        <FirstRun hasLists={(lists.data?.length ?? 0) > 0} />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pay/${p.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-surface-sunken"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-fg-muted">
                  <Send className="size-4" />
                </span>
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
                  <PayoutStatusBadge status={p.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const STEPS = [
  { icon: Upload, title: "Add your people", body: "Paste wallets or import a CSV. Save them as a list to reuse." },
  { icon: Wallet, title: "Connect a wallet", body: "Use Base Account or any browser wallet holding USDC." },
  { icon: Send, title: "Send in one go", body: "Up to 1,000 wallets per payment, batched on Base." },
];

function FirstRun({ hasLists }: { hasLists: boolean }) {
  return (
    <CardBody>
      <div className="rounded-2xl bg-surface-sunken p-5 sm:p-6">
        <h3 className="text-base font-semibold tracking-[-0.01em]">Send your first payment</h3>
        <p className="mt-1 text-sm text-fg-muted">It takes about a minute. Here&apos;s how it works:</p>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, transform: "translateY(6px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.24 }}
              className="flex flex-col gap-2"
            >
              <span className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-inverse font-mono text-[11px] text-inverse-fg">
                  {i + 1}
                </span>
                <s.icon className="size-4 text-fg-muted" />
              </span>
              <span className="text-sm font-medium">{s.title}</span>
              <span className="text-[13px] text-fg-muted text-pretty">{s.body}</span>
            </motion.li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/pay/new">
              <Plus className="size-4" /> New payment
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/lists">{hasLists ? "Pay a list" : "Create a list"}</Link>
          </Button>
        </div>
      </div>
    </CardBody>
  );
}

// ---- Lists ----

function YourLists() {
  const lists = useLists();
  const items = (lists.data ?? []).slice(0, 4);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Your lists</CardTitle>
        {(lists.data?.length ?? 0) > 0 && (
          <Link href="/lists" className="inline-flex items-center gap-1 text-[13px] font-medium text-fg-muted hover:text-fg">
            All lists <ArrowRight className="size-3.5" />
          </Link>
        )}
      </CardHeader>

      {lists.isLoading ? (
        <CardBody className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-1.5 h-3 w-16" />
              </div>
            </div>
          ))}
        </CardBody>
      ) : lists.isError ? (
        <CardBody>
          <ErrorState compact error={lists.error} onRetry={() => lists.refetch()} retrying={lists.isFetching} />
        </CardBody>
      ) : items.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={<Users />}
          title="No lists yet"
          description="Save the people you pay often, like your team or contributors, and pay them again in two clicks."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/lists">
                <Plus className="size-4" /> Create a list
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((l) => (
            <li key={l.id} className="group flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-surface-sunken">
              <Link href={`/lists/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-fg-muted">
                  <Users className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{l.name}</span>
                  <span className="block text-xs text-fg-subtle">{pluralize(l.recipient_count, "person", "people")}</span>
                </span>
              </Link>
              <Button asChild variant="secondary" size="sm" className={cn(l.recipient_count === 0 && "pointer-events-none opacity-45")}>
                <Link href={`/pay/new?list=${l.id}`} aria-disabled={l.recipient_count === 0} tabIndex={l.recipient_count === 0 ? -1 : undefined}>
                  Pay <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
