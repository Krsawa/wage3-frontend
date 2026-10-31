"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppNav } from "@/components/shell/app-nav";
import { StatusBanner } from "@/components/shell/status-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth/use-session";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { hydrated, isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-dvh flex-col" aria-busy>
        <div className="h-16 border-b border-border" />
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-3 h-5 w-80" />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <StatusBanner />
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-12">{children}</main>
    </div>
  );
}
