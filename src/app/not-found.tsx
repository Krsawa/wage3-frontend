import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" className="pressable rounded-md">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        <p className="font-display text-[64px] leading-none font-black tracking-[0.04em] text-fg sm:text-[96px]">404</p>
        <h1 className="headline mt-6 text-[26px] sm:text-[30px]">This page doesn&apos;t exist</h1>
        <p className="mt-3 max-w-sm text-[15px] text-fg-muted text-pretty">
          The link may be broken, or the payment or list was removed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
