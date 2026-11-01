"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useCreateListNow } from "@/components/lists/use-create-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, IllustratedEmpty } from "@/components/ui/states";
import { CloseIcon, PeopleIcon, PlusIcon, RepeatIcon, SearchIcon } from "@/components/ui/icons";
import { LogoPreview } from "@/components/ui/logo-field";
import { useLists } from "@/lib/api/queries";
import type { ListSummary } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatRelative, pluralize } from "@/lib/format";
import { useListLogo } from "@/lib/local-prefs";

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function ListsPage() {
  const [query, setQuery] = useState("");
  const { createNow, isCreating } = useCreateListNow();
  const search = useDebounced(query.trim());
  const lists = useLists(search || undefined);

  const searching = lists.isFetching && !lists.isLoading;

  return (
    <>
      <PageHeader
        title="Lists"
        description="Saved groups of people you pay often. Start a payment from a list and every amount is filled in for you."
        actions={
          <Button onClick={createNow} loading={isCreating} className="h-9">
            <PlusIcon className="size-4" /> New list
          </Button>
        }
      />

      {(lists.data?.length || search || query) && !lists.isError ? (
        <div className="mb-6 max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Search lists"
            aria-label="Search lists"
            leading={<SearchIcon className="size-4" />}
            trailing={
              searching ? (
                <Spinner className="mr-1.5 size-4 text-fg-subtle" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="pressable grid size-7 place-items-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                  aria-label="Clear search"
                >
                  <CloseIcon className="size-3.5" />
                </button>
              ) : null
            }
          />
        </div>
      ) : null}

      {lists.isLoading ? (
        <Card className="overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </Card>
      ) : lists.isError ? (
        <ErrorState error={lists.error} onRetry={() => lists.refetch()} retrying={lists.isFetching} />
      ) : !lists.data?.length ? (
        search ? (
          <EmptyState
            icon={<SearchIcon />}
            title={`No lists match “${search}”`}
            description="Try a different name, or clear the search to see every list."
            action={
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <Card>
            <IllustratedEmpty
              title="Save your first list"
              description="Save your team or contributors once, then pay them all in a couple of clicks every time."
              actions={
                <>
                  <Button variant="inverse" onClick={createNow} loading={isCreating}>
                    <PlusIcon className="size-4" /> Create your first list
                  </Button>
                  <Link href="/pay/new" className="text-sm font-medium text-fg-muted hover:text-fg">
                    Pay without a list
                  </Link>
                </>
              }
            />
          </Card>
        )
      ) : (
        <ListsTable lists={lists.data} animate={!search} />
      )}
    </>
  );
}

// One grid for the header and every row. Each row is its own grid, so every track is a fixed size
// (no "auto"): an auto action column sized to the header's empty cell would shift the others.
const COLS = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,1fr)_96px_160px_128px]";

/** Lists as a table: logo and name first, then the facts, then Pay again. Rows fade in on the unfiltered view. */
function ListsTable({ lists, animate }: { lists: ListSummary[]; animate: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className={cn(COLS, "hidden border-b border-border bg-surface-sunken px-5 py-2.5 text-xs font-medium text-fg-subtle sm:grid")}>
        <span>List</span>
        <span className="text-right">People</span>
        <span>Updated</span>
        <span className="sr-only">Actions</span>
      </div>
      <ul className="divide-y divide-border">
        {lists.map((list, i) => (
          <ListRow key={list.id} list={list} index={i} animate={animate} />
        ))}
      </ul>
    </Card>
  );
}

function ListRow({ list, index, animate }: { list: ListSummary; index: number; animate: boolean }) {
  const [logo] = useListLogo(list.id);
  const empty = list.recipient_count === 0;
  return (
    <motion.li
      initial={animate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: animate ? Math.min(index, 8) * 0.03 : 0 }}
      className={cn(COLS, "relative px-5 py-3 transition-colors duration-150 hover:bg-surface-hover")}
    >
      {/* The whole row opens the list; Pay again sits above the link. */}
      <Link
        href={`/lists/${list.id}`}
        aria-label={`Open ${list.name}`}
        className="absolute inset-0 outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-primary"
      />
      <div className="flex min-w-0 items-center gap-3">
        {logo ? (
          <LogoPreview src={logo} className="size-9" />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-fg-muted">
            <PeopleIcon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{list.name}</div>
          {/* Phones: the facts fold under the name. */}
          <div className="truncate text-xs text-fg-subtle sm:hidden">
            {pluralize(list.recipient_count, "person", "people")} · Updated {formatRelative(list.updated_at)}
          </div>
        </div>
      </div>
      <span className="hidden text-right text-sm tabular sm:block">{list.recipient_count.toLocaleString("en-US")}</span>
      <span className="hidden text-[13px] text-fg-muted sm:block">{formatRelative(list.updated_at)}</span>
      <div className="relative flex justify-end">
        {empty ? (
          <span className="text-[13px] text-fg-subtle">No one yet</span>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/pay/new?list=${list.id}`}>
              <RepeatIcon className="size-3.5" /> Pay again
            </Link>
          </Button>
        )}
      </div>
    </motion.li>
  );
}
