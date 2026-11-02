"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CheckIcon, CopyLinkIcon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";

const SWAP = {
  initial: { opacity: 0, filter: "blur(4px)", transform: "scale(0.8)" },
  animate: { opacity: 1, filter: "blur(0px)", transform: "scale(1)" },
  exit: { opacity: 0, filter: "blur(4px)", transform: "scale(0.8)" },
  transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const },
};

/**
 * Copy-link icon on a changelog entry: copies /changelog#slug. No toast; the icon blurs into a
 * check for a moment instead (announced to screen readers through a live region).
 */
export function CopyLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/changelog#${slug}`);
    } catch {
      toast.error("Couldn't copy the link.");
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip content={copied ? "Copied" : "Copy link"}>
      <button
        type="button"
        aria-label="Copy link"
        onClick={copy}
        className="pressable -mr-2 grid size-8 place-items-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={copied ? "check" : "copy"} {...SWAP} className="grid place-items-center">
            {copied ? <CheckIcon className="size-4 text-fg" /> : <CopyLinkIcon className="size-4" />}
          </motion.span>
        </AnimatePresence>
        <span role="status" className="sr-only">
          {copied ? "Link copied" : ""}
        </span>
      </button>
    </Tooltip>
  );
}
