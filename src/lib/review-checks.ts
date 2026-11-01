"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";

import { usePayout, useSentHistory } from "@/lib/api/queries";
import type { Payout } from "@/lib/api/types";

import { USDC } from "./config";
import { formatAmount, formatRelative, parseAmount, shortAddress } from "./format";
import { isBlankRow, type RecipientRow } from "./recipients";

/** Sent money can't be pulled back, so these flags are shown before anyone signs. */
export type RowFlag = { key: string; who: string; reason: string };

// Over this, a new sender types the total to confirm. Senders with history use 2× their median.
const NEW_SENDER_CONFIRM = parseUnits("10000", USDC.decimals);
const HISTORY_FOR_MEDIAN = 3;
// A row this many times the batch median is probably a typo (2500 typed as 25000).
const BATCH_OUTLIER = BigInt(5);
// A person paid this many times their last amount from the same list.
const PERSON_OUTLIER = BigInt(2);
const RECENT_MS = 24 * 3_600_000;

function median(values: bigint[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return sorted[Math.floor(sorted.length / 2)];
}

const amountOf = (r: RecipientRow) => {
  const a = parseAmount(r.amount);
  return a.ok ? BigInt(a.value) : null;
};

const label = (r: RecipientRow) => r.name.trim() || r.email.trim() || shortAddress(r.wallet.trim());

export function useReviewChecks(payout: Payout, rows: RecipientRow[], total: bigint) {
  const history = useSentHistory({ limit: 20 });
  // Last payment from the same list, to compare people, addresses and amounts against.
  const fromList = useSentHistory({ list_id: payout.list_id ?? "", limit: 2 }, { enabled: !!payout.list_id });
  const last = payout.list_id ? fromList.data?.items.find((p) => p.id !== payout.id) : undefined;
  const previous = usePayout(last?.id);
  // Read once: "paid this list recently" is judged from when the review opened.
  const [openedAt] = useState(() => Date.now());

  return useMemo(() => {
    const filled = rows.filter((r) => !isBlankRow(r));

    const pastTotals = (history.data?.items ?? [])
      .filter((p) => p.id !== payout.id && p.total_amount)
      .map((p) => BigInt(p.total_amount!));
    const usual = pastTotals.length >= HISTORY_FOR_MEDIAN ? median(pastTotals) : null;
    const requireTypedTotal = total > (usual ? usual * BigInt(2) : NEW_SENDER_CONFIRM);

    const flags: RowFlag[] = [];
    const prevItems = previous.data?.items ?? [];
    const prevByWallet = new Map(prevItems.map((i) => [i.wallet_address.toLowerCase(), i]));
    const batchMedian = filled.length >= 3 ? median(filled.map(amountOf).filter((a): a is bigint => a !== null)) : null;

    for (const r of filled) {
      const wallet = r.wallet.trim().toLowerCase();
      const amount = amountOf(r);
      const before = prevByWallet.get(wallet);

      if (prevItems.length && !before) {
        const sameName = prevItems.find(
          (i) =>
            (r.email.trim() && i.email?.toLowerCase() === r.email.trim().toLowerCase()) ||
            (r.name.trim() && i.name?.trim().toLowerCase() === r.name.trim().toLowerCase()),
        );
        flags.push({
          key: r.key,
          who: label(r),
          reason: sameName
            ? `Wallet changed since the last payment (was ${shortAddress(sameName.wallet_address)})`
            : "New address, not in the last payment from this list",
        });
      } else if (before && amount !== null && amount > BigInt(before.amount) * PERSON_OUTLIER) {
        flags.push({
          key: r.key,
          who: label(r),
          reason: `${formatAmount(amount)} is more than double last time (${formatAmount(before.amount)})`,
        });
      } else if (!before && batchMedian && amount !== null && amount > batchMedian * BATCH_OUTLIER) {
        flags.push({
          key: r.key,
          who: label(r),
          reason: `${formatAmount(amount)} is far above the others in this payment`,
        });
      }
    }

    const sentAt = last?.sent_at ?? last?.created_at;
    const recentDuplicate =
      sentAt && openedAt - new Date(sentAt).getTime() < RECENT_MS
        ? `You paid this list ${formatRelative(sentAt)}. Check this isn't a repeat.`
        : null;

    return { flags, requireTypedTotal, recentDuplicate };
  }, [rows, total, history.data, previous.data, last, payout.id, openedAt]);
}
