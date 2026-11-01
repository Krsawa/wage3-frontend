"use client";

import { Toaster as Sonner } from "sonner";

/**
 * One toast style app-wide, matching the row-selection toast (after X's iOS toasts): a solid
 * dark grey card rising from the bottom, white text, the action in bold white, no icon.
 * Red only for errors.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      theme="light"
      gap={8}
      offset={24}
      // Centre on the content panel like the selection toast: half the 240px desktop sidebar.
      className="lg:!ml-30"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-[14px] bg-[oklch(0.25_0_0)] py-3 pr-2 pl-4 font-sans text-white shadow-lg [&_[data-icon]]:hidden",
          title: "text-[15px] font-medium leading-5",
          description: "mt-0.5 text-[13px] text-white/80",
          content: "min-w-0 flex-1",
          actionButton:
            "pressable h-9 shrink-0 rounded-[10px] px-2.5 text-[14px] font-semibold whitespace-nowrap hover:bg-white/15",
          cancelButton:
            "pressable h-9 shrink-0 rounded-[10px] px-2.5 text-[14px] font-medium whitespace-nowrap text-white/80 hover:bg-white/15",
          error: "!bg-(--red-10)",
        },
      }}
    />
  );
}
