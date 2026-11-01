"use client";

import { Info } from "lucide-react";
import { Tooltip as T } from "radix-ui";
import type { ReactNode } from "react";

export const TooltipProvider = T.Provider;

/*
 * Matches the Lab tooltip (rndr-realm, from Mindmap's Base UI one), on the darkest grey of the
 * oklch scale (--color-950) rather than Lab's near-black: a grey label with
 * white 13/20 text, no arrow, below its trigger by default. Opens with a small fade and
 * scale from the trigger; closes with a quicker fade.
 */
export function Tooltip({
  content,
  children,
  side = "bottom",
  align = "center",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  /** "end" for triggers at a right edge, so the label lines up with them instead of being pushed. */
  align?: "start" | "center" | "end";
}) {
  // No content (e.g. a reason that only exists while a button is disabled): just the trigger.
  if (content == null || content === false || content === "") return <>{children}</>;
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          align={align}
          sideOffset={6}
          className="z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-[10px] bg-(--color-950) px-2.5 py-1 text-[13px] leading-5 font-medium tracking-[-0.0046em] text-white shadow-[0_0_0_0.5px_oklch(0_0_0/0.059),0_1px_1px_-1px_oklch(0_0_0/0.102),0_1px_2px_0_oklch(0_0_0/0.051)] data-[state=closed]:animate-tip-out data-[state=delayed-open]:animate-tip-in data-[state=instant-open]:animate-none motion-reduce:data-[state=delayed-open]:animate-none"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

/** A small ⓘ beside a label that explains it on hover or focus, like the dashboard stats. */
export function InfoTip({ label, children, align }: { label: string; children: ReactNode; align?: "start" | "center" | "end" }) {
  return (
    <Tooltip content={children} align={align}>
      <button type="button" aria-label={`About ${label.toLowerCase()}`} className="grid size-4 place-items-center rounded-full text-fg-subtle hover:text-fg">
        <Info className="size-3.5" />
      </button>
    </Tooltip>
  );
}
