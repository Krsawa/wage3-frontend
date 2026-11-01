import { formatUnits } from "viem";

import type { Payout } from "@/lib/api/types";
import { txUrl, USDC } from "@/lib/config";
import { readCompany } from "@/lib/local-prefs";

const cell = (v: string | null | undefined) => {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * One row per person with the on-chain proof, for the sender's books: a record of what went
 * out, not an invoice (that's what a payee sends to ask for money).
 */
export function payoutCsv(payout: Payout) {
  const decimals = payout.token_decimals ?? USDC.decimals;
  const symbol = payout.token_symbol ?? USDC.symbol;
  // The sender's company (Settings) on every row, when set, so the file stands on its own.
  const from = readCompany()?.name.trim() || "";
  const head = ["Name", "Email", "Wallet", `Amount (${symbol})`, "Status", "Transaction", "Explorer link", "Paid at", ...(from ? ["From"] : [])];
  const rows = payout.items.map((i) => [
    i.name,
    i.email,
    i.wallet_address,
    // Plain decimal (no thousands separators) so spreadsheets read it as a number.
    formatUnits(BigInt(i.amount), decimals),
    i.status,
    i.tx_hash,
    i.tx_hash ? txUrl(i.tx_hash) : "",
    i.paid_at,
    ...(from ? [from] : []),
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

export function downloadPayoutCsv(payout: Payout) {
  const date = (payout.paid_at ?? payout.created_at).slice(0, 10);
  const slug = (payout.name || "payment").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const url = URL.createObjectURL(new Blob([payoutCsv(payout)], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `wage3-${slug}-${date}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}
