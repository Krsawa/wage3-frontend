"use client";

import { useState } from "react";
import { toast } from "sonner";

import { addressUrl, txUrl } from "@/lib/config";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/format";

import { CheckIcon, CopyIcon, ExternalIcon } from "./icons";
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
          // One toast id: copying several in a row updates it instead of stacking.
          toast(label === "Copy hash" ? "Transaction hash copied" : label === "Copy address" ? "Address copied" : "Copied", {
            id: "copied",
            duration: 2000,
          });
          setTimeout(() => setCopied(false), 1400);
        }}
        className={cn(
          "pressable grid size-6 place-items-center rounded-md text-fg-subtle hover:bg-surface-hover hover:text-fg",
          className,
        )}
        aria-label={label}
      >
        {copied ? <CheckIcon className="size-3.5 text-success-fg" /> : <CopyIcon className="size-3.5" />}
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
  /** "hover": copy + explorer appear on row hover or focus (the row needs `group`); always shown on touch screens. */
  showActions?: boolean | "hover";
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <span className="font-mono text-[13px] tabular text-fg" title={value}>
        {shortAddress(value, chars)}
      </span>
      {showActions && (
        <span
          className={cn(
            "flex items-center gap-0.5",
            showActions === "hover" &&
              "transition-opacity duration-150 focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100",
          )}
        >
          <CopyButton value={value} label={kind === "tx" ? "Copy hash" : "Copy address"} />
          <Tooltip content="View on BaseScan">
            <a
              href={kind === "tx" ? txUrl(value) : addressUrl(value)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pressable grid size-6 place-items-center rounded-md text-fg-subtle hover:bg-surface-hover hover:text-fg"
              aria-label="View on BaseScan"
            >
              <ExternalIcon className="size-3.5" />
            </a>
          </Tooltip>
        </span>
      )}
    </span>
  );
}
