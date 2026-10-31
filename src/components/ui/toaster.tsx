"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      theme="system"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-border !bg-surface !text-fg !shadow-lg !font-sans !text-sm !gap-3 !px-4 !py-3.5",
          description: "!text-fg-muted",
          actionButton: "!bg-primary !text-primary-fg !rounded-full !px-3 !font-medium",
          cancelButton: "!bg-surface-muted !text-fg !rounded-full",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
