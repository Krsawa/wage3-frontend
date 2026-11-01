"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ExternalIcon, MailIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { LogoPreview } from "@/components/ui/logo-field";
import { ItemStatusBadge } from "@/components/ui/status-badge";
import { Address } from "@/components/ui/address";
import type { Payout, PayoutItem } from "@/lib/api/types";
import { chain, txUrl, USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { formatAmount, formatDateTime, formatFigure } from "@/lib/format";
import { useCompany } from "@/lib/local-prefs";
import { DISPLAY_FIGURE } from "@/lib/type";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email this receipt. Wage3 doesn't send mail itself yet, so this opens the sender's own email
 * app with the receipt written out (mailto). With no email on the payment, ask for one here.
 */
function SendReceipt({ payout, item, company }: { payout: Payout; item: PayoutItem; company: string }) {
  const [typed, setTyped] = useState("");
  const to = item.email || typed.trim();
  const valid = EMAIL.test(to);
  const symbol = payout.token_symbol ?? USDC.symbol;
  const amount = `${formatAmount(item.amount, payout.token_decimals ?? USDC.decimals)} ${symbol}`;
  const from = company || "We";
  const href = valid
    ? `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Payment receipt: ${amount}${company ? ` from ${company}` : ""}`)}&body=${encodeURIComponent(
        [
          `Hi${item.name ? ` ${item.name}` : ""},`,
          "",
          `${from} sent you ${amount} on ${chain.name} (${formatDateTime(item.paid_at ?? payout.created_at)}), for "${payout.name}".`,
          `To wallet: ${item.wallet_address}`,
          item.tx_hash ? `Transaction: ${txUrl(item.tx_hash)}` : "",
          "",
          company ? `— ${company}` : "",
        ]
          .filter((l, i, a) => l !== "" || a[i - 1] !== "")
          .join("\n"),
      )}`
    : undefined;

  const open = () => {
    if (href) window.location.href = href;
  };

  return (
    <section>
      {/* Short label, no helper line: the button says what it does. */}
      <div className="flex gap-2">
        {!item.email && (
          // No email on this payment: ask for one here, in the same row as the button.
          <Input
            type="email"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && open()}
            placeholder="Their email"
            aria-label="Recipient email"
            invalid={!!typed && !valid}
            className="h-10 min-w-0 text-sm"
          />
        )}
        <Button variant="secondary" onClick={open} disabled={!valid} className={item.email ? "w-full" : "shrink-0"}>
          <MailIcon className="size-4" /> Send to mail
        </Button>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

/**
 * One person's payment as a receipt, in a side drawer: how much, from whom (your company from
 * Settings, else the sending wallet), to whom, and the on-chain proof.
 */
export function RecipientReceipt({
  payout,
  item,
  open,
  onOpenChange,
}: {
  payout: Payout;
  /** Kept after closing, so the drawer doesn't go blank while it slides out. */
  item: PayoutItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [company] = useCompany();
  const symbol = payout.token_symbol ?? USDC.symbol;
  const decimals = payout.token_decimals ?? USDC.decimals;

  return (
    <Drawer
      open={open && !!item}
      onOpenChange={onOpenChange}
      title="Payment receipt"
      description={payout.name}
      footer={
        item?.tx_hash ? (
          <Button asChild variant="outline" className="w-full">
            <a href={txUrl(item.tx_hash)} target="_blank" rel="noreferrer">
              View on BaseScan <ExternalIcon className="size-4" />
            </a>
          </Button>
        ) : null
      }
    >
      {item && (
        <div className="flex flex-col gap-6">
          {/* The amount first: the one number this is about. */}
          <div className="rounded-2xl bg-(--color-25) p-5 shadow-(--shadow-xs)">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-fg-muted">Amount paid</span>
              <ItemStatusBadge status={item.status} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={cn(DISPLAY_FIGURE, "text-[32px]")} title={formatAmount(item.amount, decimals)}>{formatFigure(item.amount, decimals)}</span>
              <span className="text-base text-fg-muted">{symbol}</span>
            </div>
          </div>

          <section>
            <h3 className="text-[13px] text-fg-subtle">From</h3>
            <div className="mt-2 flex items-center gap-3">
              {company.logo && <LogoPreview src={company.logo} className="size-9" />}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{company.name || "Your wallet"}</div>
                {company.email && <div className="truncate text-[13px] text-fg-muted">{company.email}</div>}
                {payout.sender_address && <Address value={payout.sender_address} className="mt-0.5" />}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[13px] text-fg-subtle">To</h3>
            <div className="mt-2 min-w-0">
              <div className="truncate text-sm font-medium">{item.name || "No name"}</div>
              {item.email && <div className="truncate text-[13px] text-fg-muted">{item.email}</div>}
              <Address value={item.wallet_address} className="mt-0.5" />
            </div>
          </section>

          <SendReceipt key={item.id} payout={payout} item={item} company={company.name} />

          <dl className="divide-y divide-[oklch(0_0_0/0.08)] border-t border-[oklch(0_0_0/0.08)] text-[13px]">
            <Row label="Date">{formatDateTime(item.paid_at ?? payout.created_at)}</Row>
            <Row label="Network">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-base-blue" />
                {chain.name}
              </span>
            </Row>
            <Row label="Transaction">
              {item.tx_hash ? <Address value={item.tx_hash} kind="tx" /> : <span className="font-normal text-fg-subtle">Not sent</span>}
            </Row>
          </dl>
        </div>
      )}
    </Drawer>
  );
}
