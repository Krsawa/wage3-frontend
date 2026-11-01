"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DashIcon } from "@/components/ui/icons";
import { chain, LIMITS, USDC } from "@/lib/config";

const TITLES = ["Use a dedicated wallet", "Add funds", "How a payment works"];

/** Points with your dash as the marker, centred on each point's first 20px line. */
function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-5 text-pretty">
          <DashIcon className="-ml-1 size-5 shrink-0 text-fg-subtle" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * First-run walkthrough before a first payment: set up a wallet in MetaMask, Rabby or Phantom,
 * fund it, and what happens when you pay. Shown once (the caller remembers it); Skip always works.
 */
export function WalletWalkthrough({
  open,
  onOpenChange,
  onDone,
  doneLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Finished or skipped: carry on to the payment. */
  onDone: () => void;
  doneLabel: string;
}) {
  const [step, setStep] = useState(0);
  // Measured height of the current step, so the dialog can ease between sizes. A callback ref,
  // because the dialog renders in a portal that mounts after this component's effects run.
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(([e]) => setContentHeight(e.contentRect.height));
    observer.current.observe(el);
  }, []);
  const last = step === TITLES.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setStep(0);
      }}
      title={TITLES[step]}
      description="Before your first payment"
      // Footer on the dialog's white, no sunken fill; 28px from the content (was 40, 30% less).
      footerClassName="bg-transparent pt-1"
      // The top half of the dialog is the animation area: full-bleed light grey until the
      // Lottie/video goes in (data-step tells it which step).
      media={<div data-animation-slot data-step={step + 1} aria-hidden className="aspect-[16/10] w-full rounded-t-3xl bg-(--color-400) [corner-shape:superellipse(1.5)]" />}
      footer={
        <div className="flex w-full items-center gap-2">
          <button type="button" onClick={onDone} className="mr-auto text-sm font-medium text-fg-muted hover:text-fg">
            Skip
          </button>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {/* Wider than a default button (24px each side) so the forward action leads the footer. */}
          <Button variant="inverse" className="px-6" onClick={() => (last ? onDone() : setStep((s) => s + 1))}>
            {last ? doneLabel : "Next"}
          </Button>
        </div>
      }
    >
      {/* No visible progress indicator (removed by request); screen readers still hear the step. */}
      <p className="sr-only" aria-live="polite">
        Step {step + 1} of {TITLES.length}
      </p>

      {/* One step at a time; the dialog's height eases to each step's content (measured), and the
          old step pops out while the new one blurs and scales in, so the size never snaps. */}
      <div
        className="overflow-hidden transition-[height] duration-[280ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={{ height: contentHeight ?? "auto" }}
      >
        <div ref={contentRef} className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            {[step].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, transform: "scale(0.97)", filter: "blur(6px)" }}
                animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }}
                exit={{ opacity: 0, transform: "scale(0.97)", filter: "blur(6px)", transition: { duration: 0.14 } }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                {i === 0 && (
                  // One safety message, for any wallet app: a new wallet that only does payroll.
                  <div className="flex flex-col gap-5">
                    <p className="text-sm text-fg-muted text-pretty">
                      To stay safe, pay from a new wallet that only does payroll, not your personal one.
                    </p>
                    <Steps
                      items={[
                        "Create a new wallet just for payroll, in the wallet app you already use.",
                        "Keep only what you're about to pay in it.",
                        "Back up its recovery phrase offline, and never share it. No one from Wage3 will ever ask for it.",
                      ]}
                    />
                  </div>
                )}

                {i === 1 && (
                  <div className="flex flex-col gap-5">
                    <Steps
                      items={[
                        <>
                          <span className="font-medium">{USDC.symbol} on {chain.name}</span>: what you send to people.
                        </>,
                        <>
                          <span className="font-medium">A little ETH on {chain.name}</span>: pays the network fee for each
                          transaction, usually cents. Wage3 doesn&apos;t cover fees.
                        </>,
                      ]}
                    />
                  </div>
                )}

                {i === 2 && (
                  <Steps
                    items={[
                      "Add your people: paste wallets, import a CSV, or start from a saved list.",
                      "Review the total, the people and any warnings. Nothing is sent yet.",
                      `Approve once: your wallet asks you to confirm the exact ${USDC.symbol} total.`,
                      `Send: one confirmation per transaction, up to ${LIMITS.batchSize} people each. Each person's status updates as Base confirms.`,
                    ]}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Dialog>
  );
}
