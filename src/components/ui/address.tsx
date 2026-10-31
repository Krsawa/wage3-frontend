"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { addressUrl, txUrl } from "@/lib/config";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/format";

import { Tooltip } from "./tooltip";

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip content={copied ? "Copied" : label}>
      <button
        type="button"
        onClick={async (e) => {
          e.stopPropagation();
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className={cn(
          "pressable grid size-6 place-items-center rounded-md text-fg-subtle hover:bg-surface-muted hover:text-fg",
          className,
        )}
        aria-label={label}
      >
        {copied ? <Check className="size-3.5 text-success-fg" /> : <Copy className="size-3.5" />}
      </button>
    </Tooltip>
  );
}

/** Mono, shortened, with copy + explorer link. */
export function Address({
  value,
  chars = 4,
  kind = "address",
  className,
  showActions = true,
}: {
  value: string;
  chars?: number;
  kind?: "address" | "tx";
  className?: string;
  showActions?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <span className="font-mono text-[13px] tabular text-fg" title={value}>
        {shortAddress(value, chars)}
      </span>
      {showActions && (
        <>
          <CopyButton value={value} label={kind === "tx" ? "Copy hash" : "Copy address"} />
          <Tooltip content="View on BaseScan">
            <a
              href={kind === "tx" ? txUrl(value) : addressUrl(value)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pressable grid size-6 place-items-center rounded-md text-fg-subtle hover:bg-surface-muted hover:text-fg"
              aria-label="View on BaseScan"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </Tooltip>
        </>
      )}
    </span>
  );
}
