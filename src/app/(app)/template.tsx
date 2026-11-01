"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Route change: a quick fade so content doesn't teleport. Opacity only: the sidebar pill is
 * already moving, and a rising page on every click makes fast navigation bob.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}>
      {children}
    </motion.div>
  );
}
