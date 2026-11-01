"use client";

import { DropdownMenu as M } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/icons";

export const DropdownMenu = M.Root;
export const DropdownTrigger = M.Trigger;

const PANEL =
  "z-50 min-w-48 rounded-[13px] bg-surface p-[5px] shadow-(--shadow-menu) [corner-shape:superellipse(1.5)] " +
  "data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out";
const ROW =
  "flex h-[34px] cursor-default select-none items-center gap-2.5 rounded-[8px] px-2.5 text-sm outline-none [corner-shape:superellipse(1.5)] " +
  "data-highlighted:bg-surface-hover data-disabled:opacity-45";

/**
 * Scales from the trigger (origin-aware), 160ms ease-out. 5px padding with 8px items, so the
 * container is 13px: concentric radii. A layered shadow stands in for a border.
 */
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
          PANEL,
          "origin-(--radix-dropdown-menu-content-transform-origin)",
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
        ROW,
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
  return <M.Separator className="-mx-[5px] my-[5px] h-px bg-border" />;
}

/** Section label, with an optional quiet action on the right (e.g. "Reset"). */
export function DropdownLabel({
  className,
  action,
  children,
  ...props
}: ComponentProps<typeof M.Label> & { action?: ReactNode }) {
  return (
    <M.Label
      className={cn("flex items-center justify-between gap-4 px-2.5 pt-2 pb-1 text-xs font-medium text-fg-subtle", className)}
      {...props}
    >
      {children}
      {action && <span className="text-fg-subtle hover:text-fg">{action}</span>}
    </M.Label>
  );
}

/** A row that opens a secondary menu to its side. */
export const DropdownSub = M.Sub;

export function DropdownSubTrigger({
  className,
  icon,
  hint,
  children,
  ...props
}: ComponentProps<typeof M.SubTrigger> & { icon?: ReactNode; hint?: ReactNode }) {
  return (
    <M.SubTrigger className={cn(ROW, "text-fg data-[state=open]:bg-surface-hover", className)} {...props}>
      {icon && <span className="flex text-current opacity-70 [&_svg]:size-4">{icon}</span>}
      <span className="flex-1 whitespace-nowrap">{children}</span>
      {hint && <span className="max-w-32 truncate text-[13px] text-fg-subtle">{hint}</span>}
      <ChevronRightIcon className="size-4 text-fg-subtle" />
    </M.SubTrigger>
  );
}

export function DropdownSubContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof M.SubContent>) {
  return (
    <M.Portal>
      <M.SubContent
        sideOffset={sideOffset}
        alignOffset={-5}
        className={cn(PANEL, "origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-submenu-in", className)}
        {...props}
      />
    </M.Portal>
  );
}

export const DropdownRadioGroup = M.RadioGroup;

/** Single choice in a group; the chosen one gets a tick on the right. */
export function DropdownRadioItem({ className, children, ...props }: ComponentProps<typeof M.RadioItem>) {
  return (
    <M.RadioItem className={cn(ROW, "text-fg", className)} {...props}>
      <span className="flex-1 truncate">{children}</span>
      <M.ItemIndicator>
        <CheckIcon className="size-4" />
      </M.ItemIndicator>
    </M.RadioItem>
  );
}
