"use client";

import { Dialog as D } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { CloseIcon } from "./icons";

/**
 * Side drawer: slides in from the right edge (full width on phones) over a dimmed page.
 * For details that belong to a row, so the list stays in view behind it.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  // Scroll edges: a hairline under the header once content has scrolled beneath it, and one over
  // the footer while more sits below, so a sliver of overflow never reads as the end.
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const roRef = useRef<ResizeObserver | null>(null);
  const measure = (el: HTMLElement) => {
    const top = el.scrollTop > 0;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }));
  };
  // Callback ref: the content mounts inside a portal after effects run.
  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    measure(el);
    roRef.current = new ResizeObserver(() => measure(el));
    roRef.current.observe(el);
    if (el.firstElementChild) roRef.current.observe(el.firstElementChild);
  }, []);
  const HAIRLINE = "border-[oklch(0_0_0/0.08)] transition-colors duration-150";

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[var(--overlay)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
              />
            </D.Overlay>
            <D.Content asChild forceMount>
              <motion.div
                className={cn(
                  "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-lg sm:inset-y-2 sm:right-2 sm:w-[420px] sm:rounded-3xl",
                  className,
                )}
                initial={{ transform: "translateX(100%)" }}
                animate={{ transform: "translateX(0%)", transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
                exit={{ transform: "translateX(100%)", transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } }}
              >
                <div className={cn("flex items-start justify-between gap-4 border-b px-6 pt-6 pb-4", HAIRLINE, !edges.top && "border-transparent")}>
                  <div className="min-w-0 flex-1">
                    <D.Title className="headline text-[20px] leading-7 font-normal text-balance">{title}</D.Title>
                    {description ? (
                      <D.Description className="mt-1 text-sm text-fg-muted text-pretty">{description}</D.Description>
                    ) : (
                      <D.Description className="sr-only">{title}</D.Description>
                    )}
                  </div>
                  <D.Close
                    className="pressable -mt-1 -mr-2.5 grid size-9 shrink-0 place-items-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                    aria-label="Close"
                  >
                    <CloseIcon className="size-4.5" />
                  </D.Close>
                </div>
                <div
                  ref={scrollRef}
                  onScroll={(e) => measure(e.currentTarget)}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-1 pb-2"
                >
                  <div>{children}</div>
                </div>
                {footer && (
                  // Clear of the home indicator on phones.
                  <div
                    className={cn(
                      "flex gap-2 border-t px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
                      HAIRLINE,
                      !edges.bottom && "border-transparent",
                    )}
                  >
                    {footer}
                  </div>
                )}
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}
