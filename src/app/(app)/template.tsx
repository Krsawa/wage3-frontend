"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Route change: a short fade-up so content doesn't teleport. Kept subtle: users navigate often. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
