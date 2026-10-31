"use client";

import { Dialog as D } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Button } from "./button";

/**
 * Controlled modal. Centered (modals aren't anchored to a trigger), enters with
 * scale 0.96 -> 1 + fade, exits faster than it enters.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** False while something irreversible is in flight (e.g. a wallet prompt). */
  dismissible?: boolean;
}) {
  return (
    <D.Root open={open} onOpenChange={(o) => (dismissible || o) && onOpenChange(o)}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              />
            </D.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-4">
              <D.Content
                asChild
                forceMount
                onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
                onPointerDownOutside={(e) => !dismissible && e.preventDefault()}
              >
                <motion.div
                  className={cn(
                    "pointer-events-auto relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-lg sm:max-w-md sm:rounded-3xl",
                    className,
                  )}
                  initial={{ opacity: 0, transform: "translateY(16px) scale(0.96)" }}
                  animate={{
                    opacity: 1,
                    transform: "translateY(0px) scale(1)",
                    transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
                  }}
                  exit={{
                    opacity: 0,
                    transform: "translateY(8px) scale(0.98)",
                    transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
                  }}
                >
                  <div className="flex items-start justify-between gap-4 px-6 pt-6">
                    <div className="min-w-0">
                      <D.Title className="text-lg font-semibold tracking-[-0.02em] text-balance">
                        {title}
                      </D.Title>
                      {description ? (
                        <D.Description className="mt-1.5 text-sm text-fg-muted text-pretty">
                          {description}
                        </D.Description>
                      ) : (
                        <D.Description className="sr-only">{title}</D.Description>
                      )}
                    </div>
                    {dismissible && (
                      <D.Close
                        className="pressable -mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-fg"
                        aria-label="Close"
                      >
                        <X className="size-4.5" />
                      </D.Close>
                    )}
                  </div>
                  {children && <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-6">{children}</div>}
                  {footer && (
                    <div className="flex flex-col-reverse gap-2 border-t border-border bg-surface-sunken px-6 py-4 sm:flex-row sm:justify-end">
                      {footer}
                    </div>
                  )}
                </motion.div>
              </D.Content>
            </div>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}

/** For destructive or irreversible confirmations. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      dismissible={!loading}
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="pressable h-10 rounded-full px-4 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg disabled:opacity-45"
          >
            Cancel
          </button>
          <ConfirmButton tone={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </ConfirmButton>
        </>
      }
    />
  );
}

function ConfirmButton({
  tone,
  ...props
}: { tone: "danger" | "primary" } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant={tone === "danger" ? "inverse" : "primary"}
      className={tone === "danger" ? "bg-danger text-white hover:bg-danger-fg hover:opacity-100" : undefined}
      {...props}
    />
  );
}
