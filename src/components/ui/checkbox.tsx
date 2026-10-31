"use client";

import { Check, Minus } from "lucide-react";
import { useEffect, useRef, type InputHTMLAttributes, type MouseEvent } from "react";

import { cn } from "@/lib/cn";

/** Native checkbox (keyboard + screen readers for free), styled. Supports indeterminate. */
export function Checkbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  onClick,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "onChange"> & {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean, e: MouseEvent<HTMLInputElement> | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const on = checked || indeterminate;

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
          "peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[5px] border transition-[background-color,border-color] duration-150",
          on ? "border-primary bg-primary" : "border-border-strong bg-surface hover:border-fg-subtle",
          "disabled:cursor-default disabled:opacity-45",
        )}
        {...props}
      />
      <span className="pointer-events-none relative text-primary-fg">
        {indeterminate ? (
          <Minus className="size-3" strokeWidth={3.5} />
        ) : checked ? (
          <Check className="size-3" strokeWidth={3.5} />
        ) : null}
      </span>
    </span>
  );
}
