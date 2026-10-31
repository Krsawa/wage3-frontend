import type { Metadata, Viewport } from "next";
import { Doto, Inter_Tight, Roboto_Mono } from "next/font/google";

import { DevTools } from "@/components/providers/dev-tools";
import { Providers } from "@/components/providers";

import "./globals.css";

// Base Sans / Base Mono aren't public; these are the brand's listed fallbacks.
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"] });
const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"] });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"], weight: ["700", "900"] });

export const metadata: Metadata = {
  title: { default: "Wage3 — Pay your team in USDC on Base", template: "%s · Wage3" },
  description:
    "Send USDC to up to 1,000 wallets in a few clicks. Payroll, contributor rewards and bounties, settled on Base.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${robotoMono.variable} ${doto.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <DevTools />
      </body>
    </html>
  );
}
