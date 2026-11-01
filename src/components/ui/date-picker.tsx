"use client";

import { Popover as P } from "radix-ui";
import { useState, type KeyboardEvent } from "react";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Values are "YYYY-MM-DD", the format the history filters and the backend use. */
export type Ymd = string;
export type YmdRange = { from: Ymd; to: Ymd };

const SMOOTH = "[corner-shape:superellipse(1.5)]";
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (y: number, m: number, d: number): Ymd => `${y}-${pad(m + 1)}-${pad(d)}`;
// Parsed by parts, not new Date(string): that would read it as UTC and shift the day.
const parse = (v: Ymd) => {
  const [y, m, d] = v.split("-").map(Number);
  return { y, m: m - 1, d };
};
const todayYmd = () => {
  const t = new Date();
  return toYmd(t.getFullYear(), t.getMonth(), t.getDate());
};
export const formatYmd = (v: Ymd) => {
  const { y, m, d } = parse(v);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m, d));
};

/** Monday-first grid of the month, padded with neighbouring days to whole weeks. */
function monthGrid(y: number, m: number) {
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => {
    const date = new Date(y, m, 1 - lead + i);
    return { ymd: toYmd(date.getFullYear(), date.getMonth(), date.getDate()), day: date.getDate(), inMonth: date.getMonth() === m };
  });
}

function shift(v: Ymd, days: number): Ymd {
  const { y, m, d } = parse(v);
  const date = new Date(y, m, d + days);
  return toYmd(date.getFullYear(), date.getMonth(), date.getDate());
}

type CalendarProps = { min?: Ymd; max?: Ymd } & (
  | { mode: "single"; value: Ymd; onSelect: (v: Ymd) => void }
  | { mode: "range"; value: YmdRange; onSelect: (v: YmdRange) => void }
);

/**
 * Month grid in the dropdown style. Single: one day. Range: first click sets the start, the
 * next sets the end (a click before the start moves the start); days between are shaded.
 * Selected days use the sidebar's active grey, today gets a dot, out-of-range days are dimmed.
 */
export function Calendar(props: CalendarProps) {
  const { min, max } = props;
  const today = todayYmd();
  const anchor = props.mode === "single" ? props.value : props.value.to || props.value.from;
  const [focused, setFocused] = useState<Ymd>(anchor || today);
  const { y, m } = parse(focused);
  const allowed = (v: Ymd) => (!min || v >= min) && (!max || v <= max);

  const range = props.mode === "range" ? props.value : null;
  const isEnd = (v: Ymd) => (props.mode === "single" ? v === props.value : v === range!.from || v === range!.to);
  const isBetween = (v: Ymd) => !!range?.from && !!range.to && v > range.from && v < range.to;

  const pick = (v: Ymd) => {
    if (!allowed(v)) return;
    setFocused(v);
    if (props.mode === "single") return props.onSelect(v);
    const { from, to } = props.value;
    if (!from || to || v < from) props.onSelect({ from: v, to: "" });
    else props.onSelect({ from, to: v });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    // Keep arrows here: inside a menu, ArrowLeft would otherwise close the submenu.
    e.preventDefault();
    e.stopPropagation();
    const next = shift(focused, step);
    setFocused(next);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-date-cell="${next}"]`)?.focus());
  };

  return (
    <div onKeyDown={onKeyDown}>
      {/* Month + arrows */}
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <span className="text-[13px] font-medium">
          {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(y, m, 1))}
        </span>
        <span className="flex gap-0.5">
          {(
            [
              [-1, "Previous month", ChevronLeftIcon],
              [1, "Next month", ChevronRightIcon],
            ] as const
          ).map(([dir, name, Icon]) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              onClick={() => {
                // Via Date so December → January rolls the year over.
                const next = new Date(y, m + dir, 1);
                setFocused(toYmd(next.getFullYear(), next.getMonth(), 1));
              }}
              className={cn("grid size-7 place-items-center rounded-[8px] text-fg-muted hover:bg-surface-hover hover:text-fg", SMOOTH)}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </span>
      </div>

      {/* Weekdays + days */}
      <div role="grid" className="grid grid-cols-7 gap-0.5 px-[3px] pb-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="grid h-7 place-items-center text-[11px] font-medium text-fg-subtle">
            {w}
          </span>
        ))}
        {monthGrid(y, m).map((c) => {
          const selected = isEnd(c.ymd);
          const between = isBetween(c.ymd);
          const ok = allowed(c.ymd);
          return (
            <button
              key={c.ymd}
              type="button"
              data-date-cell={c.ymd}
              tabIndex={c.ymd === focused ? 0 : -1}
              disabled={!ok}
              aria-pressed={selected}
              aria-label={formatYmd(c.ymd)}
              onClick={() => pick(c.ymd)}
              className={cn(
                "relative grid h-8 place-items-center rounded-[8px] text-[13px] tabular outline-none",
                "transition-colors duration-100 focus-visible:shadow-[inset_0_0_0_1.5px_var(--primary)]",
                selected ? "bg-(--color-200) font-medium text-fg" : between ? "bg-(--color-400)" : "hover:bg-surface-hover",
                !c.inMonth && !selected && !between && "text-fg-subtle",
                !ok && "pointer-events-none opacity-35",
                SMOOTH,
              )}
            >
              {c.day}
              {c.ymd === today && <span className="absolute bottom-1 size-1 rounded-full bg-fg" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Quiet footer actions, like the menus' "Reset". */
export function CalendarFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-[5px] mt-[5px] flex items-center justify-between border-t border-border px-[15px] pt-2 pb-1.5 text-xs font-medium">
      {children}
    </div>
  );
}

/** Date field that opens a Calendar in a popover, styled like the dropdown menus. */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  invalid,
  "aria-label": ariaLabel,
}: {
  value: Ymd;
  onChange: (v: Ymd) => void;
  min?: Ymd;
  max?: Ymd;
  placeholder?: string;
  invalid?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = todayYmd();
  const allowed = (v: Ymd) => (!min || v >= min) && (!max || v <= max);
  const pick = (v: Ymd) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <P.Trigger
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn(
          "relative flex h-10 items-center rounded-xl border border-border-subtle bg-surface pr-3.5 pl-9 text-[13px] tabular outline-none",
          "transition-[border-color] duration-150 hover:border-border focus-visible:border-primary data-[state=open]:border-primary",
          "aria-invalid:border-danger",
          value ? "text-fg" : "text-fg-subtle",
          SMOOTH,
        )}
      >
        <CalendarIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
        {value ? formatYmd(value) : placeholder}
      </P.Trigger>
      <P.Portal>
        <P.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 w-[266px] origin-(--radix-popover-content-transform-origin) rounded-[13px] bg-surface p-[5px] shadow-(--shadow-menu)",
            "data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out",
            SMOOTH,
          )}
        >
          {/* Keyed by open state so it starts on the selected month each time. */}
          <Calendar key={String(open)} mode="single" value={value} onSelect={pick} min={min} max={max} />
          <CalendarFooter>
            <button
              type="button"
              disabled={!allowed(today)}
              onClick={() => pick(today)}
              className="text-fg-muted hover:text-fg disabled:opacity-35"
            >
              Today
            </button>
            <button
              type="button"
              disabled={!value}
              onClick={() => pick("")}
              className="text-fg-subtle hover:text-fg disabled:opacity-35"
            >
              Clear
            </button>
          </CalendarFooter>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
