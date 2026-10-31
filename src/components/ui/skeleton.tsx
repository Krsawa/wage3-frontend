import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-lg bg-surface-muted bg-[linear-gradient(90deg,transparent_0%,var(--surface-sunken)_50%,transparent_100%)] bg-size-[200%_100%] animate-shimmer",
        className,
      )}
    />
  );
}
