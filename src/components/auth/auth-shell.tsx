"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBanner } from "@/components/shell/status-banner";
import { Logo } from "@/components/ui/logo";

/** Centered card layout shared by sign-in and the Google callback. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StatusBanner />
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" className="pressable rounded-md">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-fg-subtle sm:px-6">
        <span>© {new Date().getFullYear()} Wage3</span>
        <span>USDC payouts, settled on Base</span>
      </footer>
    </div>
  );
}
