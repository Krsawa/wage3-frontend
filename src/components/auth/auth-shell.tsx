"use client";

import type { ReactNode } from "react";

import { StatusBanner } from "@/components/shell/status-banner";
import { LogoMark } from "@/components/ui/logo";

/**
 * Sign-in and the Google callback: one centred column (after Aave Account's sign-in), the mark
 * over the form, no header bar. `footer` (sign-in's Google pill) sits at the foot of the page.
 */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StatusBanner />
      <main className="grid flex-1 place-items-center px-4 py-16">
        <div className="w-full max-w-[360px]">
          {/* Not a link: this page shouldn't lead off to the website. Grey until the mark is final. */}
          <div className="mx-auto mb-6 w-fit">
            <LogoMark className="block size-10 rounded-full bg-(--color-600)" />
          </div>
          {children}
        </div>
      </main>
      {footer && <footer className="flex justify-center px-4 pb-8">{footer}</footer>}
    </div>
  );
}
