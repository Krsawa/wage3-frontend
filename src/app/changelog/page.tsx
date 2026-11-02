import type { Metadata } from "next";
import Link from "next/link";

import { CopyLink } from "@/components/changelog/copy-link";
import { Signature } from "@/components/changelog/signature";
import { SignatureFade } from "@/components/changelog/signature-fade";
import { Button } from "@/components/ui/button";
import { CHANGELOG, REPO_URL, type ChangelogEntry } from "@/content/changelog";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { DISPLAY_TEXT } from "@/lib/type";

export const metadata: Metadata = {
  title: "Changelog · Wage3",
  description: "What's new in Wage3.",
};

const HAIRLINE = "border-[oklch(0_0_0/0.08)]";

/**
 * Public changelog, after Interfere's (interfere.com/changelog), in our light theme: a 1200px
 * page, each release under a hairline in two columns: title and authors on the left; on the
 * right the date and Copy link, a media card and short paragraphs. One column on phones.
 */
export default function ChangelogPage() {
  return (
    <div className="min-h-dvh">
      <header className={cn("border-b", HAIRLINE)}>
        <div className="mx-auto flex h-16 max-w-[1248px] items-center justify-between px-6">
          {/* The wordmark alone, in Bricolage Grotesque. */}
          <Link href="/" className="pressable rounded-md font-[family-name:var(--font-bricolage)] text-[18px] font-semibold tracking-[-0.03em]">
            wage3
          </Link>
          {/* Into the app; its guard sends anyone logged out to log in first. */}
          <Button asChild variant="inverse" size="sm">
            <Link href="/dashboard">Use App</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1248px] px-6 pt-16 pb-24">
        <h1 className={cn(DISPLAY_TEXT, "text-[28px] leading-8 font-medium tracking-[-0.01em]")}>Changelog</h1>

        <ol className="mt-16">
          {CHANGELOG.map((entry) => (
            <Entry key={entry.slug} entry={entry} />
          ))}
        </ol>

        <p className="mt-4 text-[13px] text-fg-subtle">
          Every release is on{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-fg-muted underline-offset-4 hover:text-fg hover:underline">
            GitHub
          </a>
          .
        </p>
      </main>
    </div>
  );
}

function Entry({ entry }: { entry: ChangelogEntry }) {
  return (
    <li id={entry.slug} className={cn("scroll-mt-8 border-t pt-10 pb-16", HAIRLINE)}>
      <div className="grid gap-x-20 gap-y-8 md:grid-cols-2">
        {/* Left column, full height of the entry: title and authors at the top (down by the date
            row, 32px + 12px, so they top out with the media card, and sticky beside a long entry),
            the signature at the bottom left. */}
        <div className="flex flex-col">
          <div data-entry-head className="md:sticky md:top-8 md:pt-11">
            <h2 className={cn(DISPLAY_TEXT, "text-[24px] leading-8 font-[450] tracking-[-0.01em] text-balance")}>{entry.title}</h2>
            <ul className="mt-7 flex flex-col gap-1">
              {entry.authors.map((a) => (
                <li key={a.github}>
                  {/* As in the reference: the author is a link with a soft hover fill, pulled 8px
                      left so the avatar stays on the column edge. */}
                  <a
                    href={`https://github.com/${a.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="-ml-2 flex w-fit items-center gap-2.5 rounded-xl py-1 pr-3 pl-2 transition-colors duration-150 hover:bg-surface-hover"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a 32px avatar */}
                    <img
                      src={a.avatar ?? `https://github.com/${a.github}.png?size=64`}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 rounded-full bg-(--color-400) object-cover shadow-[0_0_0_1px_oklch(0_0_0/0.06)]"
                    />
                    <div className="text-[13px] leading-5">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-fg-muted">{a.role}</div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {/* Desktop: blurs away as it scrolls up into the sticky title and authors. */}
          <SignatureFade className="hidden pt-10 md:mt-auto md:block">
            <Signatures entry={entry} className="flex" />
          </SignatureFade>
        </div>

        <div>
          {/* Date (and PR) over the media card, with the link to this entry beside it. */}
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-[13px] text-fg-muted">
              <time dateTime={entry.date} className="tabular">
                {formatDate(entry.date, { month: "long" })}
              </time>
              {entry.prs?.map((n) => (
                <a
                  key={n}
                  href={`${REPO_URL}/pull/${n}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-fg-subtle tabular transition-colors duration-150 hover:text-fg"
                >
                  #{n}
                </a>
              ))}
            </div>
            <CopyLink slug={entry.slug} />
          </div>
          {/* Media card: the release's image when there is one, otherwise its title on grey. */}
          <div
            className={cn(
              "relative aspect-[560/292] overflow-hidden rounded-2xl border bg-(--color-25) [corner-shape:superellipse(1.5)]",
              HAIRLINE,
            )}
          >
            {entry.media ? (
              // eslint-disable-next-line @next/next/no-img-element -- release art, sized by the card
              <img src={entry.media.src} alt={entry.media.alt} className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className={cn(DISPLAY_TEXT, "absolute bottom-6 left-6 text-[20px] font-medium tracking-[-0.015em] text-fg/80 sm:bottom-8 sm:left-10 sm:text-[24px]")}>
                {entry.title}
              </span>
            )}
          </div>
          <div className="mt-10 flex flex-col gap-6">
            {entry.body.map((p) => (
              <p key={p} className="text-[14px] leading-5 font-normal tracking-[-0.0046em] text-fg-muted text-pretty">
                {p}
              </p>
            ))}
          </div>
          <Signatures entry={entry} className="mt-8 flex md:hidden" />
        </div>
      </div>
    </li>
  );
}

/** The authors' signatures, drawn on as they scroll in (as on the labs page). */
function Signatures({ entry, className }: { entry: ChangelogEntry; className?: string }) {
  if (!entry.authors.some((a) => a.signature)) return null;
  return (
    <div className={cn("gap-6", className)}>
      {entry.authors.map((a) => a.signature && <Signature key={a.github} signature={a.signature} label={`Signed by ${a.name}`} />)}
    </div>
  );
}
