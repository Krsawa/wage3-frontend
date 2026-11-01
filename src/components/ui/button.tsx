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
    "pressable relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium whitespace-nowrap",
    "disabled:pointer-events-none disabled:opacity-45",
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
      {/* Content blurs out under the spinner instead of swapping abruptly. */}
      <span
        className={cn(
          "inline-flex items-center gap-[inherit] transition-[filter,opacity] duration-200",
          loading && "opacity-0 blur-[2px]",
        )}
      >
        {children}
      </span>
      <AnimatePresence>
        {loading && (
          <motion.span
            className="absolute inset-0 grid place-items-center"
            initial={{ opacity: 0, transform: "scale(0.8)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={{ opacity: 0, transform: "scale(0.8)" }}
            transition={{ duration: 0.15 }}
          >
            <Spinner className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
});
