"use client";

import { motion } from "motion/react";
import { Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Address } from "@/components/ui/address";
import { RecipientReceipt } from "@/components/pay/recipient-receipt";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BatchStatusBadge, ItemStatusBadge } from "@/components/ui/status-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { CheckCircleIcon, DownloadIcon, ExternalIcon, SearchIcon } from "@/components/ui/icons";
import type { Payout, PayoutItem } from "@/lib/api/types";
import { chain, txUrl, USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { downloadPayoutCsv } from "@/lib/export-payout";
import { formatAmount, formatDateTime, formatFigure, pluralize, shortAddress } from "@/lib/format";
import { DISPLAY_FIGURE } from "@/lib/type";

/** Progress hero for a payout that has started sending. */
export function PayoutProgress({ payout }: { payout: Payout }) {
  const total = payout.batch_count || 1;
  const confirmed = payout.confirmed_batch_count;
  const sending = payout.batches.filter((b) => b.status === "submitted").length;
  const paid = payout.status === "paid";
  const symbol = payout.token_symbol ?? USDC.symbol;
  const decimals = payout.token_decimals ?? USDC.decimals;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {paid ? (
              <motion.span
                initial={{ opacity: 0, transform: "scale(0.8)" }}
                animate={{ opacity: 1, transform: "scale(1)" }}
                transition={{ type: "spring", duration: 0.45, bounce: 0.3 }}
                className="text-success"
              >
                <CheckCircleIcon className="size-5" />
              </motion.span>
            ) : (
              <Clock className="size-5 text-info" />
            )}
            <span>
              {paid
                ? `Paid${payout.paid_at ? ` · ${formatDateTime(payout.paid_at)}` : ""}`
                : payout.status === "partially_paid"
                  ? "Partially paid"
                  : sending
                    ? `Confirming on ${chain.name}…`
                    : "Waiting to be sent"}
            </span>
          </div>
          {/* Money in the display figure like every other amount; the one big number on the page. */}
          <div className="mt-3 flex items-baseline gap-2">
            <span className={cn(DISPLAY_FIGURE, "text-[40px]")} title={formatAmount(payout.total_amount, decimals)}>{formatFigure(payout.total_amount, decimals)}</span>
            <span className="text-base text-fg-muted">{symbol}</span>
          </div>
          <div className="mt-1 text-sm text-fg-muted">
            to {pluralize(payout.recipient_count ?? payout.items.length, "person", "people")}
            {payout.sender_address && (
              <>
                {" "}from <span className="font-mono">{shortAddress(payout.sender_address)}</span>
              </>
            )}
          </div>
        </div>
        {/* Only worth showing with several transactions; for one, the status line above says it all. */}
        {total > 1 && (
          <div className="min-w-48 sm:text-right">
            <div className="text-[13px] text-fg-muted">
              {confirmed} of {total} batches confirmed
            </div>
            {/* Functional progress: grows to the confirmed fraction, never decorative. */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <motion.div
                className={cn("h-full origin-left rounded-full", paid ? "bg-success" : "bg-primary")}
                initial={false}
                animate={{ transform: `scaleX(${confirmed / total})` }}
                transition={{ duration: 0.5, ease: [0.77, 0, 0.175, 1] }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function BatchList({ payout }: { payout: Payout }) {
  if (payout.batches.length <= 1 && !payout.batches[0]?.tx_hash) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <ul className="divide-y divide-border border-t border-border">
        {payout.batches.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
            <span className="w-20 font-medium">Batch {b.batch_index + 1}</span>
            <span className="text-fg-muted tabular">
              {pluralize(b.recipient_count, "person", "people")} · {formatAmount(b.total_amount, payout.token_decimals ?? USDC.decimals)}{" "}
              {payout.token_symbol ?? USDC.symbol}
            </span>
            <span className="ml-auto flex items-center gap-3">
              {b.tx_hash && (
                <a
                  href={txUrl(b.tx_hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[13px] text-fg-muted hover:text-fg"
                >
                  {shortAddress(b.tx_hash, 6)} <ExternalIcon className="size-3" />
                </a>
              )}
              <BatchStatusBadge status={b.status} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const PAGE = 50;

/** Read-only people table with per-person status. */
export function ItemsTable({ payout }: { payout: Payout }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const decimals = payout.token_decimals ?? USDC.decimals;
  const showStatus = payout.status !== "draft";
  // The person whose receipt is in the drawer (kept while it closes).
  const [receipt, setReceipt] = useState<PayoutItem | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const openReceipt = (i: PayoutItem) => {
    setReceipt(i);
    setReceiptOpen(true);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payout.items;
    return payout.items.filter(
      (i) =>
        i.wallet_address.includes(q) || i.name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q),
    );
  }, [payout.items, query]);

  return (
    <Card>
      <CardHeader className="items-center pb-3">
        <CardTitle>{pluralize(payout.items.length, "person", "people")}</CardTitle>
        <div className="flex items-center gap-2">
          {payout.items.length > 8 && (
            <div className="w-56">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people"
                leading={<SearchIcon className="size-4" />}
                className="h-9 text-sm"
              />
            </div>
          )}
          {/* Export where the records are: same CSV as the ⋯ menu. Only once something was sent. */}
          {showStatus && (
            <Tooltip content="Export CSV" align="end">
              <Button
                variant="outline"
                size="icon"
                aria-label="Export CSV"
                className="rounded-xl [corner-shape:superellipse(1.5)]"
                onClick={() => {
                  downloadPayoutCsv(payout);
                  toast.success(`Exported ${pluralize(payout.items.length, "person", "people")}`);
                }}
              >
                <DownloadIcon className="size-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-surface-sunken text-left text-xs text-fg-subtle">
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Wallet</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              {showStatus && <th className="px-5 py-2.5 text-right font-medium">Status</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, visible).map((i) => (
              // Sent payments: the whole row opens that person's receipt. The name is a real button
              // for keyboards; the wallet's copy/explorer actions stop the click from reaching the row.
              <tr
                key={i.id}
                onClick={showStatus ? () => openReceipt(i) : undefined}
                className={cn("group", showStatus && "cursor-pointer transition-colors duration-100 hover:bg-surface-hover")}
              >
                <td className="max-w-56 px-5 py-3">
                  {showStatus ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openReceipt(i);
                      }}
                      className="block max-w-full truncate text-left font-medium outline-offset-2"
                      aria-label={`View receipt for ${i.name || i.wallet_address}`}
                    >
                      {i.name || <span className="font-normal text-fg-subtle">No name</span>}
                    </button>
                  ) : (
                    <div className="truncate font-medium">{i.name || <span className="font-normal text-fg-subtle">No name</span>}</div>
                  )}
                  {i.email && <div className="truncate text-xs text-fg-subtle">{i.email}</div>}
                </td>
                <td className="px-3 py-3">
                  <Address value={i.wallet_address} showActions="hover" />
                </td>
                <td className="px-3 py-3 text-right font-mono text-[13px] tabular">{formatAmount(i.amount, decimals)}</td>
                {showStatus && (
                  <td className="px-5 py-3 text-right">
                    <ItemStatusBadge status={i.status} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="px-5 py-8 text-center text-sm text-fg-muted">No one matches “{query}”.</p>}
      </div>
      <RecipientReceipt payout={payout} item={receipt} open={receiptOpen} onOpenChange={setReceiptOpen} />
      {filtered.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE * 4)}
          className="w-full border-t border-border py-3 text-sm font-medium text-fg-muted hover:text-fg"
        >
          Show more ({filtered.length - visible} left)
        </button>
      )}
    </Card>
  );
}
