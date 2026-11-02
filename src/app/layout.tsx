import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Doto, Inter, Roboto_Mono } from "next/font/google";

import { DevTools } from "@/components/providers/dev-tools";
import { Providers } from "@/components/providers";

import "./globals.css";

// Monument Grotesk for headlines (loaded in globals.css from public/fonts, not committed: it's a
// commercial font; without the files, headlines fall back to Inter), Inter for body copy.
// opsz axis: Inter Display is the same family at optical size 32.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"] });
// Base Mono isn't public; Roboto Mono is the brand's listed fallback.
const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"] });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"], weight: ["700", "900"] });
// The "wage3" wordmark on its own (the changelog header).
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600"] });

export const metadata: Metadata = {
  title: { default: "Wage3 — Pay your team in USDC on Base", template: "%s · Wage3" },
  description:
    "Send USDC to up to 1,000 wallets in a few clicks. Payroll, contributor rewards and bounties, settled on Base.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${robotoMono.variable} ${doto.variable} ${bricolage.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <DevTools />
      </body>
    </html>
  );
}
