"use client";

import { motion } from "motion/react";
import { ChevronRight, Plus, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useCreateListNow } from "@/components/lists/use-create-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useLists } from "@/lib/api/queries";
import type { ListSummary } from "@/lib/api/types";
import { formatRelative, pluralize } from "@/lib/format";

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
          <Button onClick={createNow} loading={isCreating}>
            <Plus className="size-4" /> New list
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
            leading={<Search className="size-4" />}
            trailing={
              searching ? (
                <Spinner className="mr-1.5 size-4 text-fg-subtle" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="pressable grid size-7 place-items-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-fg"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null
            }
          />
        </div>
      ) : null}

      {lists.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[118px] rounded-2xl" />
          ))}
        </div>
      ) : lists.isError ? (
        <ErrorState error={lists.error} onRetry={() => lists.refetch()} retrying={lists.isFetching} />
      ) : !lists.data?.length ? (
        search ? (
          <EmptyState
            icon={<Search />}
            title={`No lists match “${search}”`}
            description="Try a different name, or clear the search to see every list."
            action={
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Users />}
            title="No lists yet"
            description="Save your team or contributors once, then pay them all in a couple of clicks every time."
            action={
              <Button onClick={createNow} loading={isCreating}>
                <Plus className="size-4" /> Create your first list
              </Button>
            }
          />
        )
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.data.map((list, i) => (
            <ListCard key={list.id} list={list} index={i} animate={!search} />
          ))}
        </ul>
      )}
    </>
  );
}

/** Cards stagger in on the unfiltered grid; search results just appear (cards are only animated on mount). */
function ListCard({ list, index, animate }: { list: ListSummary; index: number; animate: boolean }) {
  return (
    <motion.li
      initial={animate ? { opacity: 0, transform: "translateY(8px)" } : false}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.25, delay: animate ? Math.min(index, 8) * 0.04 : 0, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        href={`/lists/${list.id}`}
        className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-[border-color,background-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-fg-muted">
            <Users className="size-4" />
          </span>
          <h3 className="min-w-0 flex-1 truncate pt-1.5 text-[15px] font-semibold tracking-[-0.01em]">{list.name}</h3>
          <ChevronRight className="mt-2 size-4 shrink-0 text-fg-subtle transition-colors duration-150 group-hover:text-fg" />
        </div>
        <div className="mt-5 flex items-center justify-between text-[13px]">
          <span className="font-medium tabular">{pluralize(list.recipient_count, "person", "people")}</span>
          <span className="text-fg-subtle">Updated {formatRelative(list.updated_at)}</span>
        </div>
      </Link>
    </motion.li>
  );
}
