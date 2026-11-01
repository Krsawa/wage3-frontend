"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PeopleIcon, RepeatIcon } from "@/components/ui/icons";
import { LogoPreview } from "@/components/ui/logo-field";
import type { ListSummary } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { useListLogo } from "@/lib/local-prefs";
import { DISPLAY_FIGURE } from "@/lib/type";

/**
 * A saved list, the same card on the dashboard and the Lists page: name, when it changed,
 * how many people, and Pay again (what you mostly do with a list). The whole card opens it.
 */
export function ListCard({ list }: { list: ListSummary }) {
  const empty = list.recipient_count === 0;
  const [logo] = useListLogo(list.id);
  return (
    <Card className="group relative flex h-full flex-col p-5 transition-shadow duration-150 hover:shadow-md">
      <Link
        href={`/lists/${list.id}`}
        className="absolute inset-0 rounded-2xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`Open ${list.name}`}
      />
      <div className="flex items-center gap-3">
        {logo ? (
          <LogoPreview src={logo} className="size-10" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-fg-muted">
            <PeopleIcon className="size-4.5" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium">{list.name}</span>
          <span className="block text-[13px] text-fg-subtle">Updated {formatRelative(list.updated_at)}</span>
        </span>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-fg-muted">People</div>
          <div className={cn(DISPLAY_FIGURE, "mt-1 text-[22px] leading-none")}>{list.recipient_count.toLocaleString("en-US")}</div>
        </div>
        {/* An empty list can't be paid: say so instead of showing a dead button. */}
        {empty ? (
          <span className="text-[13px] text-fg-subtle">No one yet</span>
        ) : (
          <Button asChild size="sm" variant="secondary" className="relative">
            <Link href={`/pay/new?list=${list.id}`}>
              <RepeatIcon className="size-3.5" /> Pay again
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
