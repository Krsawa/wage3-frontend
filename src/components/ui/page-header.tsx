import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[13px] font-medium text-fg-subtle">{eyebrow}</div>}
        {/* 32px line box, so a long payment or list name that wraps keeps its lines apart. */}
        <h1 className="headline text-[28px] leading-8 font-normal text-balance">{title}</h1>
        {/* Title and description read as one item: the same ink gap as before (the taller line box
            already adds 2px below the title, so the margin drops from 6px to 4px). */}
        {description && (
          <p className="mt-1 max-w-xl text-[14px] leading-5 font-normal tracking-[-0.0046em] text-fg-muted text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
