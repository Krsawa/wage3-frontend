"use client";

import { Tooltip as T } from "radix-ui";
import type { ReactNode } from "react";

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-50 origin-(--radix-tooltip-content-transform-origin) rounded-lg bg-inverse px-2.5 py-1.5 text-xs font-medium text-inverse-fg shadow-md data-[state=delayed-open]:animate-[menu-in_125ms_var(--ease-out)] data-[state=instant-open]:animate-none"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
