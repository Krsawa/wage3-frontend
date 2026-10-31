import { base, baseSepolia } from "viem/chains";
import type { Address } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? baseSepolia.id);

/** The one chain the backend accepts. Payouts on any other chain are rejected. */
export const chain = chainId === base.id ? base : baseSepolia;

export const isTestnet = chain.id !== base.id;

export const BATCHER_ADDRESS = (process.env.NEXT_PUBLIC_BATCHER_ADDRESS ??
  "0x54737EaD375DD4b2c561c171e41e69A9EE2FfFcd") as Address;

export const USDC = {
  address: (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address,
  symbol: "USDC",
  decimals: 6,
} as const;

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || undefined;

export const explorerUrl = chain.blockExplorers.default.url;
export const txUrl = (hash: string) => `${explorerUrl}/tx/${hash}`;
export const addressUrl = (address: string) => `${explorerUrl}/address/${address}`;

/** Backend limits (see wage3-backend handlers). */
export const LIMITS = {
  listRecipients: 1000,
  payoutItems: 1000,
  batchSize: 200,
  nameLength: 100,
} as const;
