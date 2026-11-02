"use client";

import { Toaster as Sonner } from "sonner";

import { cn } from "@/lib/cn";

import { toastTone } from "./toast-tone";

/**
 * One toast style app-wide, matching the row-selection toast (after X's iOS toasts): a card
 * rising from the bottom, the action in bold, no icon. Look comes from toast-tone (light now,
 * dark kept); errors take the red variant.
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
            // One height for every one-line toast, with or without an action: the selection toast's
            // build, 52px min with 8px top and bottom, so a 36px Undo sits 8px from each edge and an
            // 18px corner stays concentric. 16px each side; the right drops to 8px beside an action.
            cn(
              "flex min-h-13 w-full items-center gap-3 rounded-[18px] px-4 py-2 font-sans has-[[data-button]]:pr-2 [corner-shape:superellipse(1.5)] [&_[data-icon]]:hidden",
              toastTone.surface,
            ),
          title: "text-[15px] font-medium leading-5",
          description: cn("mt-0.5 text-[13px]", toastTone.muted),
          content: "min-w-0 flex-1",
          actionButton:
            cn("pressable h-9 shrink-0 rounded-[10px] px-2.5 text-[14px] font-semibold whitespace-nowrap", toastTone.action),
          cancelButton:
            cn("pressable h-9 shrink-0 rounded-[10px] px-2.5 text-[14px] font-medium whitespace-nowrap", toastTone.muted, toastTone.action),
          error: toastTone.errorSurface,
        },
      }}
    />
  );
}
