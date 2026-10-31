"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { WalletButton } from "@/components/wallet/wallet-button";
import { isTestnet, chain } from "@/lib/config";
import { cn } from "@/lib/cn";

import { UserMenu } from "./user-menu";

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/lists", label: "Lists" },
  { href: "/history", label: "History" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/dashboard" className="pressable shrink-0 rounded-md">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
                active(l.href) ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {active(l.href) && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-surface-muted"
                  transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                />
              )}
              <span className="relative">{l.label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isTestnet && (
            <span className="hidden rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-fg-subtle lg:inline">
              {chain.name}
            </span>
          )}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/pay/new">
              <Plus className="size-4" /> New payment
            </Link>
          </Button>
          <WalletButton />
          <UserMenu />
        </div>
      </div>

      {/* Mobile tabs */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Main">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap",
              active(l.href) ? "bg-surface-muted text-fg" : "text-fg-muted",
            )}
          >
            {l.label}
          </Link>
        ))}
        <Link href="/pay/new" className="ml-auto rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-primary-fg">
          Pay
        </Link>
      </nav>
    </header>
  );
}
