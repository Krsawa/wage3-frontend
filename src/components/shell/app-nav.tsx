"use client";


import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type FormEvent } from "react";
import { useConfig, useConnection } from "wagmi";
import { getConnection } from "wagmi/actions";

import { ChevronRightIcon, ExternalIcon, HashIcon, HistoryIcon, HomeIcon, ListIcon, PaymentIcon, PlusIcon, SearchIcon, SettingsIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { WalletWalkthrough } from "@/components/onboarding/wallet-walkthrough";
import { ConnectDialog } from "@/components/wallet/connect-dialog";
import { WalletButton } from "@/components/wallet/wallet-button";
import { addressUrl, BATCHER_ADDRESS } from "@/lib/config";
import { cn } from "@/lib/cn";
import { useLocalValue } from "@/lib/local-prefs";

import { UserCard } from "./user-menu";

type NavLink = { href: string; label: string; icon: ComponentType<{ className?: string }>; external?: boolean };

// Grouped like a dashboard sidebar: where you are, what you do, where the money lives.
const SECTIONS: { title?: string; links: NavLink[] }[] = [
  {
    links: [
      { href: "/dashboard", label: "Home", icon: HomeIcon },
      { href: "/history", label: "History", icon: HistoryIcon },
    ],
  },
  {
    title: "Pay",
    links: [
      { href: "/pay/new", label: "New payment", icon: PaymentIcon },
      { href: "/lists", label: "Lists", icon: ListIcon },
    ],
  },
  {
    title: "On-chain",
    links: [{ href: addressUrl(BATCHER_ADDRESS), label: "Batcher contract", icon: HashIcon, external: true }],
  },
];

const MOBILE = [
  { href: "/dashboard", label: "Home" },
  { href: "/lists", label: "Lists" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop: fixed left rail. Hidden below `lg`, where the top bar carries the tabs instead. */
export function AppSidebar() {
  const active = useActive();

  return (
    <aside className="hidden h-dvh w-60 shrink-0 flex-col lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="pressable rounded-md">
          <Logo mark={false} />
        </Link>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pt-2">
        {SECTIONS.map((section, i) => (
          <div key={section.title ?? i} className="flex flex-col gap-0.5">
            {section.title && (
              <div className="px-3 pb-1.5 text-[13px] text-fg-subtle">
                {section.title}
              </div>
            )}
            {section.links.map((l) => {
              const on = !l.external && active(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  target={l.external ? "_blank" : undefined}
                  rel={l.external ? "noreferrer" : undefined}
                  className={cn(
                    // No transitions: hover and the active state change instantly, on click and on sweep.
                    "relative flex h-9 items-center gap-2.5 rounded-[8px] px-3 text-sm font-medium [corner-shape:superellipse(1.5)]",
                    on ? "text-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg",
                  )}
                >
                  {/* No slide between links: the highlight lands on the clicked link instantly. */}
                  {on && <span className="absolute inset-0 rounded-[8px] bg-(--color-200) [corner-shape:superellipse(1.5)]" />}
                  <l.icon className="relative size-4 shrink-0" />
                  <span className="relative flex-1">{l.label}</span>
                  {l.external && <ExternalIcon className="relative size-3.5 text-fg-subtle" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings sits at the bottom with the account, apart from the everyday sections. */}
      <div className="flex flex-col gap-1 p-3">
        <Link
          href="/settings"
          className={cn(
            "relative flex h-9 items-center gap-2.5 rounded-[8px] px-3 text-sm font-medium [corner-shape:superellipse(1.5)]",
            active("/settings") ? "text-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg",
          )}
        >
          {active("/settings") && <span className="absolute inset-0 rounded-[8px] bg-(--color-200) [corner-shape:superellipse(1.5)]" />}
          <SettingsIcon className="relative size-4 shrink-0" />
          <span className="relative">Settings</span>
        </Link>
        <UserCard />
      </div>
    </aside>
  );
}

/** Search + wallet + the one primary action. On small screens it also carries the logo and tabs. */
/** Where a page sits, for the breadcrumb: its parent, linked when the parent is a page. */
function parentOf(pathname: string): { label: string; href?: string } | null {
  if (pathname === "/pay/new") return { label: "Pay" };
  if (pathname.startsWith("/pay/")) return { label: "History", href: "/history" };
  if (pathname.startsWith("/lists/")) return { label: "Lists", href: "/lists" };
  return null;
}

/**
 * Watches the page's h1 inside the scroll panel and reports when it has scrolled up under the
 * top bar. Pages render their h1 after data loads (and swap it while renaming), so a
 * MutationObserver re-attaches to whichever h1 is current.
 */
function useScrolledPastTitle(pathname: string) {
  const [state, setState] = useState({ path: "", title: "", past: false });
  useEffect(() => {
    const root = document.getElementById("app-scroll");
    if (!root) return;
    let watched: Element | null = null;
    // The 64px top bar covers the top of the panel; a title under it counts as gone.
    const io = new IntersectionObserver(
      ([e]) => setState({ path: pathname, title: e.target.textContent?.trim() ?? "", past: !e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0) + 64 }),
      { root, rootMargin: "-64px 0px 0px 0px" },
    );
    const attach = () => {
      const h1 = root.querySelector("main h1");
      if (h1 === watched) return;
      if (watched) io.unobserve(watched);
      watched = h1;
      if (h1) io.observe(h1);
    };
    attach();
    const mo = new MutationObserver(attach);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  // Keyed by path so a new page never starts with the last page's crumb showing.
  return state.path === pathname && state.past ? state.title : null;
}

/** Appears once the page title scrolls away, so you still know where you are. */
function Breadcrumb({ pathname }: { pathname: string }) {
  const title = useScrolledPastTitle(pathname);
  const parent = parentOf(pathname);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-16 items-center justify-center md:flex">
      <AnimatePresence>
        {title && (
          <motion.nav
            key={pathname}
            aria-label="Breadcrumb"
            initial={{ opacity: 0, filter: "blur(4px)", transform: "translateY(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)", transform: "translateY(-2px)", transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto flex max-w-[min(420px,40vw)] items-center gap-1.5 text-sm"
          >
            {parent && (
              <>
                {parent.href ? (
                  <Link href={parent.href} className="shrink-0 text-fg-muted hover:text-fg">
                    {parent.label}
                  </Link>
                ) : (
                  <span className="shrink-0 text-fg-muted">{parent.label}</span>
                )}
                <ChevronRightIcon className="size-3.5 shrink-0 text-fg-subtle" />
              </>
            )}
            <span aria-current="page" className="truncate font-medium text-fg">
              {title}
            </span>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppTopbar() {
  const active = useActive();
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  // Searches payments by name; History owns the results and filters.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/history?q=${encodeURIComponent(term)}` : "/history");
  };

  return (
    // On phones the bar is the navigation, so it's always there. On desktop the sidebar
    // navigates, so the bar only stays where it does a job: the wallet and the breadcrumb on
    // the payment and list-detail flows. Home, History and Lists carry their actions in the page header.
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 bg-bg/85 backdrop-blur-xl",
        !(pathname.startsWith("/pay") || /^\/lists\/[^/]+/.test(pathname)) && "lg:hidden",
      )}
    >
      <div className="relative flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Breadcrumb pathname={pathname} />
        <Link href="/dashboard" className="pressable shrink-0 rounded-md lg:hidden">
          <Logo mark={false} />
        </Link>

        {/* Hidden on History, whose own search does the same job. */}
        <form
          onSubmit={submit}
          role="search"
          className={cn("relative hidden w-full max-w-[269px]", !pathname.startsWith("/history") && "sm:block")}
        >
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search payments"
            aria-label="Search payments"
            className="h-10 w-full rounded-full bg-surface-muted pr-4 pl-10 text-sm outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-fg-subtle focus:bg-surface focus:shadow-[0_0_0_2px_var(--primary)]"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          {/* Home has New payment in the page now, so the bar always carries the wallet. */}
          <WalletButton filled className="h-9" />
        </div>
      </div>

      {/* Below lg the sidebar is hidden, so the sections become tabs. */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden" aria-label="Main">
        {MOBILE.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap",
              active(l.href) ? "bg-surface-muted text-fg" : "text-fg-muted",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/**
 * "New payment" on the home page. The first time, it opens a short walkthrough (get a wallet,
 * fund it, how paying works). Then, with no wallet connected, it opens the wallet picker and
 * carries on to /pay/new once the wallet connects. Closing the picker without connecting drops
 * the intent, so a later connect doesn't jump pages unexpectedly.
 */
export function NewPaymentButton({ className }: { className?: string }) {
  const { isConnected } = useConnection();
  const config = useConfig();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [onboarded, setOnboarded] = useLocalValue("wage3.onboarded");
  const heading = useRef(false);

  useEffect(() => {
    if (heading.current && isConnected) {
      heading.current = false;
      router.push("/pay/new");
    }
  }, [isConnected, router]);

  // After the walkthrough (finished or skipped): remember it, then carry on as a normal click.
  const proceed = () => {
    setOnboarded("1");
    setGuideOpen(false);
    if (getConnection(config).isConnected) return router.push("/pay/new");
    heading.current = true;
    setOpen(true);
  };

  if (isConnected && onboarded) {
    return (
      <Button asChild size="sm" className={className}>
        <Link href="/pay/new">
          <PlusIcon className="size-4" /> New payment
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        className={className}
        onClick={() => {
          if (!onboarded) return setGuideOpen(true);
          heading.current = true;
          setOpen(true);
        }}
      >
        <PlusIcon className="size-4" /> New payment
      </Button>
      <WalletWalkthrough
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onDone={proceed}
        // One label either way; without a wallet it opens the wallet picker next.
        doneLabel="Get started"
      />
      <ConnectDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          // Read the store directly: this render's isConnected can lag the connect that just closed us.
          if (!o && !getConnection(config).isConnected) heading.current = false;
        }}
      />
    </>
  );
}
