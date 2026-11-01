"use client";

import { Slot } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { Spinner } from "./spinner";

const variants = {
  // Base Blue: one per screen, the action that matters most.
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  inverse: "bg-inverse text-inverse-fg hover:bg-[oklch(0.3_0_0)]",
  secondary: "bg-surface-muted text-fg hover:bg-border",
  outline: "border border-border-subtle bg-surface text-fg hover:border-border hover:bg-surface-hover",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-hover",
  danger: "bg-danger-soft text-danger-fg hover:bg-danger hover:text-white",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] font-semibold gap-2",
  icon: "size-9",
  "icon-sm": "size-8",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  asChild?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, asChild, disabled, children, ...props },
  ref,
) {
  const classes = cn(
    "pressable relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium whitespace-nowrap",
    // Loading also disables the button, but it shouldn't look switched off: fade only real disabled.
    "disabled:pointer-events-none [&:disabled:not([aria-busy])]:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );

  if (asChild) {
    return (
      <Slot.Root ref={ref} className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Loading: the label dips 3px, then springs up 10px and blurs out; the spinner does the
          mirror (drops in from above, overshoots 3px, settles, un-blurs). Transform, blur and
          opacity only; the button clips them. When loading ends the label settles back in. */}
      <motion.span
        className="inline-flex items-center gap-[inherit]"
        initial={false}
        animate={
          loading
            ? { y: [0, 3, -10], opacity: [1, 1, 0], filter: ["blur(0px)", "blur(0px)", "blur(6px)"] }
            : { y: 0, opacity: 1, filter: "blur(0px)" }
        }
        // Per property: the dip plays fully visible, then the fade and blur ride the spring up.
        transition={
          loading
            ? {
                y: { duration: 0.36, times: [0, 0.35, 1], ease: "easeOut" },
                opacity: { duration: 0.2, delay: 0.12, times: [0, 0, 1], ease: "easeOut" },
                filter: { duration: 0.2, delay: 0.12, times: [0, 0, 1], ease: "easeOut" },
              }
            : { duration: 0.24, ease: [0.23, 1, 0.32, 1] }
        }
      >
        {children}
      </motion.span>
      <AnimatePresence>
        {loading && (
          <motion.span
            className="absolute inset-0 grid place-items-center"
            initial={{ y: -10, opacity: 0, filter: "blur(6px)" }}
            animate={{ y: [-10, 3, 0], opacity: [0, 1, 1], filter: ["blur(6px)", "blur(0px)", "blur(0px)"] }}
            exit={{ y: 10, opacity: 0, filter: "blur(6px)", transition: { duration: 0.18 } }}
            // Starts as the label lifts away, so the two hand over instead of overlapping.
            transition={{
              y: { duration: 0.36, delay: 0.14, times: [0, 0.65, 1], ease: "easeOut" },
              opacity: { duration: 0.18, delay: 0.14, times: [0, 1, 1], ease: "easeOut" },
              filter: { duration: 0.24, delay: 0.14, times: [0, 1, 1], ease: "easeOut" },
            }}
          >
            <Spinner className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
});
