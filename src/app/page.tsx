"use client";

import { motion, type Variants } from "motion/react";
import { ArrowRight, ArrowUpRight, KeyRound, PenLine, ScanSearch, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBanner } from "@/components/shell/status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { Logo, LogoMark } from "@/components/ui/logo";
import { useSession } from "@/lib/auth/use-session";
import { chain } from "@/lib/config";

const EASE = [0.23, 1, 0.32, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, transform: "translateY(10px)" },
  show: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.5, ease: EASE } },
};

/** Fades up once when scrolled into view. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: "translateY(12px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function PrimaryCta({ size = "lg" }: { size?: "md" | "lg" }) {
  const { isAuthenticated } = useSession();
  return (
    <Button asChild size={size}>
      <Link href={isAuthenticated ? "/dashboard" : "/sign-in"}>
        {isAuthenticated ? "Open app" : "Get started"} <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <StatusBanner />

      <header className="sticky top-0 z-40 border-b border-transparent bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="pressable rounded-md">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-medium text-fg-muted md:flex">
            <a href="#how" className="rounded-full px-3 py-1.5 transition-colors duration-150 hover:text-fg">
              How it works
            </a>
            <a href="#trust" className="rounded-full px-3 py-1.5 transition-colors duration-150 hover:text-fg">
              Security
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            {!isAuthenticated && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
            <PrimaryCta size="md" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-28 lg:pb-28">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.p variants={item} className="font-display text-[15px] font-black tracking-[0.12em] text-fg">
              USDC ON BASE
            </motion.p>
            <motion.h1
              variants={item}
              className="headline mt-5 text-[44px] text-balance sm:text-[60px] lg:text-[68px]"
            >
              Pay your whole team in one transaction.
            </motion.h1>
            <motion.p variants={item} className="mt-6 max-w-lg text-[17px] leading-[1.45] text-fg-muted text-pretty">
              Send USDC to up to 1,000 wallets at once. Wage3 groups payments into batches of 200 on Base, so a
              full payroll costs cents in fees, not dollars.
            </motion.p>
            <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
              <PrimaryCta />
              <Button asChild variant="outline" size="lg">
                <a href="#how">See how it works</a>
              </Button>
            </motion.div>
            <motion.p variants={item} className="mt-6 text-[13px] text-fg-subtle">
              Free to start. Sign in with email or Google. Connect any wallet.
            </motion.p>
          </motion.div>

          <HeroVisual />
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-border bg-surface-sunken">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <Reveal>
              <p className="text-[13px] font-medium text-fg-subtle">How it works</p>
              <h2 className="headline mt-3 max-w-xl text-[34px] text-balance sm:text-[44px]">
                From spreadsheet to settled in three steps.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.06}>
                  <div className="h-full rounded-3xl border border-border bg-surface p-6 sm:p-7">
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-fg [&_svg]:size-5">
                        {s.icon}
                      </span>
                      <span className="font-mono text-[13px] text-fg-subtle">0{i + 1}</span>
                    </div>
                    <h3 className="mt-8 text-lg font-semibold tracking-[-0.02em]">{s.title}</h3>
                    <p className="mt-2 text-[15px] leading-[1.45] text-fg-muted text-pretty">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <Reveal>
                <p className="text-[13px] font-medium text-fg-subtle">Built for trust</p>
                <h2 className="headline mt-3 text-[34px] text-balance sm:text-[44px]">
                  Your wallet signs. The chain keeps the receipt.
                </h2>
                <p className="mt-5 max-w-md text-[15px] leading-[1.45] text-fg-muted text-pretty">
                  Wage3 prepares the payment. You approve it in your own wallet, and USDC moves straight to each
                  person. We never touch the money.
                </p>
              </Reveal>
              <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2">
                {FACTS.map((f, i) => (
                  <Reveal key={f.title} delay={i * 0.05} className="bg-surface">
                    <div className="h-full p-6 sm:p-7">
                      <span className="flex text-fg [&_svg]:size-5">{f.icon}</span>
                      <h3 className="mt-5 text-[15px] font-semibold tracking-[-0.01em]">{f.title}</h3>
                      <p className="mt-1.5 text-sm leading-[1.45] text-fg-muted text-pretty">{f.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <Reveal className="mx-auto max-w-6xl">
            <div className="flex flex-col items-start gap-8 rounded-[28px] bg-inverse px-7 py-12 text-inverse-fg sm:px-12 sm:py-16 md:flex-row md:items-end md:justify-between">
              <div>
                <LogoMark className="size-8 rounded-[7px]" />
                <h2 className="headline mt-8 max-w-lg text-[34px] text-balance sm:text-[44px]">
                  Run your next payroll in minutes.
                </h2>
                <p className="mt-4 max-w-md text-[15px] opacity-70 text-pretty">
                  Import a CSV, review the total, and sign once. Done.
                </p>
              </div>
              <PrimaryCta />
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-[13px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="text-fg" />
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Settles on {chain.name}</span>
            <a
              href="https://www.base.org"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-fg"
            >
              Built on Base <ArrowUpRight className="size-3.5" />
            </a>
            <Link href="/sign-in" className="transition-colors duration-150 hover:text-fg">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  {
    icon: <FileIcon />,
    title: "Add people",
    body: "Import a CSV, paste from a spreadsheet, or start from a saved list. Wallets are checked as you type.",
  },
  {
    icon: <ScanSearch />,
    title: "Review",
    body: "See every name, wallet and amount, plus the total. Fix anything inline before it's locked in.",
  },
  {
    icon: <PenLine />,
    title: "Sign once",
    body: "Approve USDC and sign in your wallet. Up to 200 people are paid per transaction, confirmed in seconds.",
  },
];

const FACTS = [
  {
    icon: <KeyRound />,
    title: "Non-custodial",
    body: "Funds go from your wallet to theirs. Wage3 never holds USDC.",
  },
  {
    icon: <Zap />,
    title: "Settles on Base",
    body: "Fast, low-cost transactions on Coinbase's Ethereum L2.",
  },
  {
    icon: <ScanSearch />,
    title: "Every payment on BaseScan",
    body: "Each batch has a public transaction you can share as a receipt.",
  },
  {
    icon: <ShieldCheckIcon />,
    title: "No double payments",
    body: "Each batch has a unique reference the contract accepts only once.",
  },
];

const RECIPIENTS = [
  { name: "Ada Lovelace", wallet: "0x71C7…976F", amount: "4,200.00" },
  { name: "Grace Hopper", wallet: "0x2F3a…11Bd", amount: "3,850.00" },
  { name: "Alan Turing", wallet: "0x9bE0…4c27", amount: "3,850.00" },
  { name: "Katherine Johnson", wallet: "0x05aD…e9F1", amount: "2,600.00" },
  { name: "Linus Torvalds", wallet: "0xC4d8…73A0", amount: "1,500.00" },
];

/** A mock payout card in pure HTML/CSS: what a finished payment looks like. */
function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(16px) scale(0.98)" }}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
      className="relative mx-auto w-full max-w-[480px]"
    >
      {/* Blue square echoing the Base mark, sitting behind the card. */}
      <div aria-hidden className="absolute -top-5 -right-3 size-24 rounded-[22px] bg-base-blue sm:-top-7 sm:-right-7 sm:size-32 sm:rounded-[28px]" />

      <div className="relative rounded-3xl border border-border bg-surface shadow-lg" aria-label="Example payment" role="img">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div>
            <p className="text-[13px] text-fg-subtle">Payment</p>
            <p className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em]">October payroll</p>
          </div>
          <Badge tone="success" dot>
            Paid
          </Badge>
        </div>

        <motion.ul
          className="mt-5 divide-y divide-border border-y border-border"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } } }}
          initial="hidden"
          animate="show"
        >
          {RECIPIENTS.map((r) => (
            <motion.li
              key={r.name}
              variants={{
                hidden: { opacity: 0, transform: "translateY(4px)" },
                show: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.35, ease: EASE } },
              }}
              className="flex items-center gap-3 px-5 py-3 sm:px-6"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-[12px] font-semibold text-fg-muted">
                {r.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="font-mono text-xs text-fg-subtle">{r.wallet}</p>
              </div>
              <span className="font-mono text-sm tabular">{r.amount}</span>
            </motion.li>
          ))}
        </motion.ul>

        <div className="flex items-end justify-between gap-4 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[13px] text-fg-subtle">Total · 5 people</p>
            <p className="mt-0.5 text-2xl font-semibold tracking-[-0.03em] tabular">
              16,000.00 <span className="text-base font-medium text-fg-muted">USDC</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-fg-subtle">1 transaction</p>
            <p className="mt-0.5 font-mono text-xs text-fg-muted">0x8f2e…b41c</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
