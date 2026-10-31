import { formatUnits, isAddress, parseUnits } from "viem";

import { USDC } from "./config";

/**
 * Base units ("1500000") -> display ("1.50"). Uses bigint math throughout:
 * amounts can exceed Number's safe range.
 */
export function formatAmount(
  baseUnits: string | bigint | null | undefined,
  decimals: number = USDC.decimals,
  { minFraction = 2, maxFraction = decimals }: { minFraction?: number; maxFraction?: number } = {},
): string {
  if (baseUnits === null || baseUnits === undefined || baseUnits === "") return "0.00";
  const raw = formatUnits(BigInt(baseUnits), decimals);
  const [whole, frac = ""] = raw.split(".");
  const trimmed = frac.slice(0, maxFraction).replace(/0+$/, "").padEnd(minFraction, "0");
  const grouped = BigInt(whole).toLocaleString("en-US");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

/** "1,234.5 USDC" */
export function formatToken(
  baseUnits: string | bigint | null | undefined,
  symbol: string | null = USDC.symbol,
  decimals: number | null = USDC.decimals,
) {
  return `${formatAmount(baseUnits, decimals ?? USDC.decimals)} ${symbol ?? USDC.symbol}`;
}

/** Compact for stat tiles: 12.4K, 1.2M. Display only, never for math. */
export function formatCompact(baseUnits: string | bigint, decimals: number = USDC.decimals) {
  const n = Number(formatUnits(BigInt(baseUnits), decimals));
  if (n < 10_000) return formatAmount(baseUnits, decimals, { maxFraction: 2 });
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const AMOUNT_RE = /^\d*\.?\d*$/;

/**
 * User input ("1,250.5") -> base units ("1250500000"), or an error message.
 * Mirrors the backend's rule: a whole number of base units above 0.
 */
export function parseAmount(
  input: string,
  decimals: number = USDC.decimals,
): { ok: true; value: string } | { ok: false; error: string } {
  const clean = input.replace(/[,\s]/g, "");
  if (!clean) return { ok: false, error: "Enter an amount" };
  if (!AMOUNT_RE.test(clean) || clean === ".") return { ok: false, error: "Enter a valid number" };
  const frac = clean.split(".")[1] ?? "";
  if (frac.length > decimals) return { ok: false, error: `At most ${decimals} decimal places` };
  const value = parseUnits(clean, decimals);
  if (value <= BigInt(0)) return { ok: false, error: "Amount must be above 0" };
  return { ok: true, value: value.toString() };
}

/** Base units -> the string a user would type back into an input ("1250.5"). */
export function toInputAmount(baseUnits: string | null | undefined, decimals = USDC.decimals) {
  if (!baseUnits) return "";
  return formatUnits(BigInt(baseUnits), decimals);
}

export function sumAmounts(values: (string | null | undefined)[]): bigint {
  return values.reduce<bigint>((acc, v) => (v ? acc + BigInt(v) : acc), BigInt(0));
}

export function validateWallet(input: string): string | null {
  const v = input.trim();
  if (!v) return "Enter a wallet address";
  if (!isAddress(v, { strict: false })) return "Not a valid wallet address";
  if (/^0x0{40}$/i.test(v)) return "Can't send to the zero address";
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateEmail(input: string | null | undefined): string | null {
  const v = input?.trim();
  if (!v) return null;
  return EMAIL_RE.test(v) ? null : "Not a valid email";
}

/** 0x1234…abcd */
export function shortAddress(address: string | null | undefined, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined) {
  return formatDate(iso, { hour: "2-digit", minute: "2-digit" });
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function formatRelative(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(iso);
}

/** Date -> "YYYY-MM-DD" in UTC, the format the backend's from/to expect. */
export function toApiDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}
