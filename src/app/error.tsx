"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" className="pressable rounded-md">
          <Logo />
        </Link>
      </header>
      <main role="alert" className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger-fg">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="headline mt-6 text-[26px] sm:text-[30px]">Something went wrong</h1>
        <p className="mt-3 max-w-sm text-[15px] text-fg-muted text-pretty">
          The page hit an unexpected error. No payment was sent because of it. Try again, or head back to your
          dashboard.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-fg-subtle">Ref: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} variant="inverse">
            <RotateCw className="size-4" /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
