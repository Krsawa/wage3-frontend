"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppSidebar, AppTopbar } from "@/components/shell/app-nav";
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
    // Desktop: the sidebar sits on the frame, and the top bar + page are one panel, rounded at
    // the top and running off the bottom of the screen like a sheet,
    // that scrolls on its own. Below lg the panel goes edge to edge.
    <div className="flex h-dvh bg-surface-sunken">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 lg:pt-6 lg:pr-2">
        <div
          id="app-scroll"
          className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-bg lg:rounded-t-2xl lg:border lg:border-b-0 lg:border-border lg:shadow-sm"
        >
          <StatusBanner />
          <AppTopbar />
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-10 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
