"use client";

import { AlertTriangle, LogOut } from "lucide-react";
import { useState } from "react";
import { useConnection, useDisconnect, useReadContract, useSwitchChain } from "wagmi";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/address";
import {
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useHydrated } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";
import { chain, USDC } from "@/lib/config";
import { erc20Abi } from "@/lib/contracts";
import { formatAmount, shortAddress } from "@/lib/format";

import { ConnectDialog } from "./connect-dialog";

export function useUsdcBalance() {
  const { address } = useConnection();
  return useReadContract({
    address: USDC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: chain.id,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
}

// `filled` (top bar): borderless grey fill to match the search field, and no icon on
// "Connect wallet" so it reads as a quiet secondary action.
const FILLED = "border-0 bg-surface-muted hover:bg-(--color-50)";

export function WalletButton({
  size = "sm",
  className,
  filled,
}: {
  size?: "sm" | "md";
  className?: string;
  filled?: boolean;
}) {
  const hydrated = useHydrated();
  const { address, isConnected, chainId, isReconnecting } = useConnection();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const balance = useUsdcBalance();

  if (!hydrated || isReconnecting) {
    return <div className={cn("h-8 w-32 rounded-full bg-surface-muted", className)} aria-hidden />;
  }

  if (!isConnected || !address) {
    return (
      <>
        <Button variant="outline" size={size} className={cn(filled && FILLED, className)} onClick={() => setOpen(true)}>
          Connect wallet
        </Button>
        <ConnectDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  if (chainId !== chain.id) {
    return (
      <Button
        variant="secondary"
        size={size}
        className={cn("bg-warning-soft text-warning-fg hover:bg-warning hover:text-(--gray-100)", className)}
        loading={switching}
        onClick={() => switchChain({ chainId: chain.id })}
      >
        <AlertTriangle className="size-4" /> Switch to {chain.name}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <Button variant="outline" size={size} className={cn("gap-2 pl-1.5", filled && FILLED, className)}>
          <WalletAvatar address={address} className="size-6" />
          <span className="text-[13px] tabular">{shortAddress(address)}</span>
        </Button>
      </DropdownTrigger>
      {/* After Aave's wallet menu: the wallet as a row you're "in", account facts as label/value rows, then Disconnect. */}
      <DropdownContent className="w-64">
        <DropdownLabel>Your wallet</DropdownLabel>
        <div className="flex h-[34px] items-center gap-2.5 px-2.5">
          <WalletAvatar address={address} className="size-5" />
          <span className="flex-1 text-sm tabular">{shortAddress(address)}</span>
          <CopyButton value={address} label="Copy address" className="-mr-1" />
        </div>
        <DropdownSeparator />
        <dl className="flex flex-col text-sm">
          <div className="flex h-[34px] items-center justify-between gap-3 px-2.5">
            <dt className="text-fg-muted">Balance</dt>
            <dd className="tabular">
              {balance.isLoading ? "…" : balance.data !== undefined ? formatAmount(balance.data) : "—"}{" "}
              <span className="text-fg-muted">{USDC.symbol}</span>
            </dd>
          </div>
          <div className="flex h-[34px] items-center justify-between gap-3 px-2.5">
            <dt className="text-fg-muted">Network</dt>
            <dd className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-base-blue" />
              {chain.name}
            </dd>
          </div>
        </dl>
        <DropdownSeparator />
        <DropdownItem icon={<LogOut />} onSelect={() => disconnect()}>
          Disconnect
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
}

/** Round gradient avatar, the same for the same address: two oklch hues taken from it. */
export function WalletAvatar({ address, className }: { address: string; className?: string }) {
  const hue = parseInt(address.slice(2, 6), 16) % 360;
  const hue2 = (hue + 40 + (parseInt(address.slice(6, 8), 16) % 60)) % 360;
  return (
    <span
      aria-hidden
      className={cn("shrink-0 rounded-full shadow-[inset_0_0_0_0.5px_oklch(0_0_0/0.1)]", className)}
      style={{ background: `linear-gradient(160deg, oklch(0.82 0.15 ${hue}), oklch(0.62 0.2 ${hue2}))` }}
    />
  );
}
