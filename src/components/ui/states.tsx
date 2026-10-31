"use client";

import { motion } from "motion/react";
import { AlertTriangle, RotateCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

import { Button } from "./button";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      className={cn("flex flex-col items-center px-6 py-14 text-center", className)}
    >
      {icon && (
        <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-surface-muted text-fg-muted [&_svg]:size-5">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold tracking-[-0.01em] text-balance">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-fg-muted text-pretty">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </motion.div>
  );
}

/** Inline error for a failed query, with a retry. */
export function ErrorState({
  error,
  onRetry,
  retrying,
  title,
  className,
  compact,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  const e = toApiError(error);
  const Icon = e.isNetwork ? WifiOff : AlertTriangle;

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-center gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-fg",
          className,
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">{e.message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="pressable inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            <RotateCw className={cn("size-3.5", retrying && "animate-spin")} /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div role="alert" className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger-fg">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold tracking-[-0.01em]">
        {title ?? (e.isNetwork ? "You're offline" : e.isNotFound ? "Not found" : "Couldn't load this")}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-fg-muted text-pretty">{e.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry} loading={retrying}>
          <RotateCw className="size-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}
