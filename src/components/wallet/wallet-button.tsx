"use client";

import { AlertTriangle, LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import { useConnection, useDisconnect, useReadContract, useSwitchChain } from "wagmi";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/address";
import {
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useHydrated } from "@/lib/auth/use-session";
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

export function WalletButton({ size = "sm" }: { size?: "sm" | "md" }) {
  const hydrated = useHydrated();
  const { address, isConnected, chainId, isReconnecting } = useConnection();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const balance = useUsdcBalance();

  if (!hydrated || isReconnecting) {
    return <div className="h-8 w-32 rounded-full bg-surface-muted" aria-hidden />;
  }

  if (!isConnected || !address) {
    return (
      <>
        <Button variant="outline" size={size} onClick={() => setOpen(true)}>
          <Wallet className="size-4" /> Connect wallet
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
        className="bg-warning-soft text-warning-fg hover:bg-warning hover:text-gray-100"
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
        <Button variant="outline" size={size} className="pl-1.5">
          <span className="size-5 rounded-full border-[5px] border-base-blue bg-surface" />
          <span className="font-mono text-[13px] tabular">{shortAddress(address)}</span>
        </Button>
      </DropdownTrigger>
      <DropdownContent className="w-64">
        <div className="px-2.5 pt-2 pb-3">
          <div className="text-xs text-fg-subtle">USDC balance</div>
          <div className="mt-0.5 text-xl font-semibold tracking-[-0.02em] tabular">
            {balance.isLoading ? "…" : balance.data !== undefined ? formatAmount(balance.data) : "—"}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[13px] text-fg-muted">
            <span className="font-mono tabular">{shortAddress(address, 6)}</span>
            <CopyButton value={address} label="Copy address" />
          </div>
          <div className="mt-1 text-xs text-fg-subtle">{chain.name}</div>
        </div>
        <DropdownSeparator />
        <DropdownItem icon={<LogOut />} onSelect={() => disconnect()}>
          Disconnect
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
}
