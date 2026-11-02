"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBanner } from "@/components/shell/status-banner";
import { LogoMark } from "@/components/ui/logo";

const FOOTER_LINKS = [
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/**
 * Sign-in and the Google callback: one centred column (after Aave Account's sign-in), the mark
 * over the form, no header bar. `footer` (sign-in's Google pill) and the legal links sit at the
 * foot of the page.
 */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StatusBanner />
      <main className="grid flex-1 place-items-center px-4 py-16">
        <div className="w-full max-w-[360px]">
          {/* Not a link: this page shouldn't lead off to the website. Grey until the mark is final. */}
          <div className="mx-auto mb-6 w-fit">
            <LogoMark className="size-10 rounded-full bg-(--color-600)" />
          </div>
          {children}
        </div>
      </main>
      <footer className="flex flex-col items-center gap-5 px-4 pb-8">
        {footer}
        {/* As in the reference: quiet links with dot separators. The pages are still to come. */}
        <nav aria-label="Legal" className="flex items-center gap-2.5 text-[13px] text-fg-subtle">
          {FOOTER_LINKS.map((l, i) => (
            <span key={l.href} className="flex items-center gap-2.5">
              {i > 0 && <span aria-hidden className="size-0.5 rounded-full bg-current opacity-60" />}
              <Link href={l.href} className="transition-colors duration-150 hover:text-fg">
                {l.label}
              </Link>
            </span>
          ))}
        </nav>
      </footer>
    </div>
  );
}
