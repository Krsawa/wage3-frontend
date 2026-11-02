import { KUROSAWA_SIGNATURE, type SignatureData } from "@/components/changelog/signature";

/**
 * The public changelog (/changelog), newest first. Each entry is one shipped pull request (or the
 * first commit), written for the people who use Wage3 rather than for developers. Add an entry
 * when a PR merges.
 */
export const REPO_URL = "https://github.com/Seun-Oyediran/wage3-frontend";

export type ChangelogAuthor = {
  name: string;
  role: string;
  /** GitHub login: the key, and the avatar when there's no `avatar`. */
  github: string;
  /** A picture in /public to use instead of the GitHub avatar. */
  avatar?: string;
  /** Drawn at the foot of entries this author wrote. */
  signature?: SignatureData;
};

export type ChangelogEntry = {
  /** URL fragment for "Copy link" (/changelog#slug). */
  slug: string;
  /** ISO date the change went out (the PR's merge date). */
  date: string;
  title: string;
  authors: ChangelogAuthor[];
  /** Short paragraphs, plain text. */
  body: string[];
  /** Image or video for the media card; until there is one, the card shows the title. */
  media?: { src: string; alt: string };
  /** Pull requests this entry covers. */
  prs?: number[];
};

// Roles are a first guess; edit to taste.
const JASON: ChangelogAuthor = { name: "Jason Udi", role: "Design Engineer", github: "Krsawa", signature: KUROSAWA_SIGNATURE };
const SEUN: ChangelogAuthor = { name: "Seun Oyediran", role: "Engineering", github: "Seun-Oyediran" };

export const CHANGELOG: ChangelogEntry[] = [
  {
    slug: "simpler-log-in",
    date: "2026-11-02",
    title: "A simpler log-in",
    authors: [JASON],
    body: [
      "Logging in is now one field. Type your email and Continue appears as soon as it looks complete. We’ll sign you up if you don’t have an account yet.",
      "Continue with Google has moved to the foot of the page, with a Last used badge when that’s how you came in last time.",
      "Notifications have a lighter look across the app. Emails on a payment are now optional too: a mistyped one is flagged in amber but never stops anyone being paid.",
    ],
  },
  {
    slug: "receipts-and-safer-payments",
    date: "2026-11-01",
    title: "Receipts and safer payments",
    authors: [JASON],
    body: [
      "Your first payment now starts with a short walkthrough: use a wallet just for payroll, add USDC and a little ETH for gas, and see how a payment goes through. You can replay it from Settings.",
      "Everyone in a sent payment has a receipt. Click their row to see what they were paid, from whom, and the transaction on Base, then email it to them.",
      "Rows that can’t be paid are flagged above the table before you review, with what’s wrong in plain words, like “37 characters short” or “ENS isn’t supported”. Show just those rows, or remove them in one go.",
      "Large payments ask you to type the total before sending, so a stray zero gets caught.",
    ],
    prs: [2],
  },
  {
    slug: "redesign",
    date: "2026-11-01",
    title: "A redesigned Wage3",
    authors: [JASON],
    body: [
      "Wage3 has a new look, from the sidebar to the smallest button, with clearer navigation and a home overview of what you’ve sent over the last 7, 30 or 90 days.",
      "A new Settings page holds your company’s name, email and logo, which appear on receipts and CSV exports.",
      "Select rows to set or split amounts from a bar that stays in reach on long lists. History has status tabs, filters by list and date, and one search. Export any sent payment as CSV, with a BaseScan link for every person.",
    ],
    prs: [1],
  },
  {
    slug: "wage3-is-live",
    date: "2026-10-31",
    title: "Wage3 is live",
    authors: [SEUN],
    body: [
      "Pay your whole team in USDC on Base, in one go.",
      "Log in with an email code or Google, save the people you pay as lists or import them from a CSV, set or split amounts, and review everything before it’s sent. Payments go out in batches of up to 200 people per transaction, and you can watch each one confirm.",
    ],
  },
];
