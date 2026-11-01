"use client";

import { useEffect, useRef, type InputHTMLAttributes, type MouseEvent } from "react";

import { CheckIcon, DeleteIcon, WarningIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

// Blue 9 (white tick 3.54:1, above the 3:1 for controls), blue 10 under the pointer.
const ON = "border-(--blue-9) bg-(--blue-9) hover:border-(--blue-10) hover:bg-(--blue-10)";

/**
 * Native checkbox (keyboard + screen readers for free), styled. Supports indeterminate.
 * `warning`: ticked, it shows the amber warning symbol instead of the blue box, so a row
 * that's included despite a problem says so in the control itself.
 */
export function Checkbox({
  checked,
  indeterminate = false,
  warning = false,
  onCheckedChange,
  onClick,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "onChange"> & {
  checked: boolean;
  indeterminate?: boolean;
  warning?: boolean;
  onCheckedChange: (checked: boolean, e: MouseEvent<HTMLInputElement> | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const on = checked || indeterminate;
  const warn = warning && checked && !indeterminate;

  return (
    <span className={cn("relative inline-grid size-4.5 shrink-0 place-items-center", className)}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        // onClick (not onChange) so callers get shiftKey for range selection.
        onClick={(e) => {
          onClick?.(e);
          onCheckedChange(e.currentTarget.checked, e);
        }}
        onChange={() => {}}
        className={cn(
          "peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[6px] border outline-none transition-[background-color,border-color,box-shadow] duration-150",
          "focus-visible:shadow-[0_0_0_3px_var(--blue-5)]",
          warn
            ? "border-transparent bg-transparent"
            : on
              ? ON
              : "border-border-strong bg-surface hover:border-fg-subtle",
          "disabled:cursor-default disabled:opacity-45",
        )}
        {...props}
      />
      <span className={cn("pointer-events-none relative", warn ? "text-warning-fg" : "text-white")}>
        {warn ? (
          <WarningIcon className="size-4.5" />
        ) : indeterminate ? (
          <DeleteIcon className="size-3" strokeWidth={3} />
        ) : checked ? (
          <CheckIcon className="size-3" strokeWidth={3} />
        ) : null}
      </span>
    </span>
  );
}
