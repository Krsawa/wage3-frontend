"use client";

import { DropdownMenu as M } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export const DropdownMenu = M.Root;
export const DropdownTrigger = M.Trigger;

/** Scales from the trigger (origin-aware), 160ms ease-out. */
export function DropdownContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 origin-(--radix-dropdown-menu-content-transform-origin) rounded-2xl border border-border bg-surface p-1.5 shadow-lg",
          "data-[state=open]:animate-[menu-in_160ms_var(--ease-out)] data-[state=closed]:animate-[menu-out_120ms_var(--ease-out)]",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownItem({
  className,
  icon,
  tone,
  children,
  ...props
}: ComponentProps<typeof M.Item> & { icon?: ReactNode; tone?: "danger" }) {
  return (
    <M.Item
      className={cn(
        "flex h-9 cursor-default select-none items-center gap-2.5 rounded-xl px-2.5 text-sm outline-none",
        "data-highlighted:bg-surface-muted data-disabled:opacity-45",
        tone === "danger" ? "text-danger-fg" : "text-fg",
        className,
      )}
      {...props}
    >
      {icon && <span className="flex text-current opacity-70 [&_svg]:size-4">{icon}</span>}
      {children}
    </M.Item>
  );
}

export function DropdownSeparator() {
  return <M.Separator className="-mx-1.5 my-1.5 h-px bg-border" />;
}

export function DropdownLabel({ className, ...props }: ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-2.5 pt-1.5 pb-1 text-xs text-fg-subtle", className)} {...props} />;
}
