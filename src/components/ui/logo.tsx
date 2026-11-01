import { cn } from "@/lib/cn";

/** The Base-style blue square plus wordmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-5 shrink-0 rounded-[5px] bg-base-blue", className)}
    />
  );
}

/** `mark={false}`: wordmark only, as in the app sidebar. */
export function Logo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark && <LogoMark />}
      <span className="text-[17px] font-semibold tracking-[-0.03em]">wage3</span>
    </span>
  );
}
