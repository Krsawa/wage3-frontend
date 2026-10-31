"use client";

import { AnimatePresence, motion } from "motion/react";
import { PauseCircle } from "lucide-react";

import { useAppStatus } from "@/lib/api/queries";

/** The backend's payments breaker. Shown everywhere, before login too. */
export function StatusBanner() {
  const { data } = useAppStatus();
  const paused = data && !data.payments.enabled;

  return (
    <AnimatePresence initial={false}>
      {paused && (
        <motion.div
          role="status"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden bg-warning text-gray-100"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-[13px] font-medium">
            <PauseCircle className="size-4 shrink-0" />
            <span>{data.payments.message ?? "Payments are paused. Please try again later"}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function usePaymentsPaused() {
  const { data } = useAppStatus();
  return {
    paused: !!data && !data.payments.enabled,
    message: data?.payments.message ?? null,
  };
}
