import type { SVGProps } from "react";

/** House with a floor line. Drawn on a 24 grid, 2px stroke; inherits text colour. */
export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 10.2847C4 9.44537 4 9.02572 4.10594 8.63772C4.1998 8.29397 4.35414 7.9697 4.56174 7.68009C4.79607 7.3532 5.12176 7.08857 5.77316 6.55932L8.97316 3.95932C10.0521 3.08266 10.5916 2.64434 11.1913 2.47646C11.7203 2.3284 12.2797 2.3284 12.8087 2.47646C13.4084 2.64434 13.9479 3.08266 15.0268 3.95932L18.2268 6.55932C18.8782 7.08857 19.2039 7.3532 19.4383 7.68009C19.6459 7.9697 19.8002 8.29397 19.8941 8.63772C20 9.02572 20 9.44537 20 10.2847V15.2C20 16.8802 20 17.7202 19.673 18.362C19.3854 18.9265 18.9265 19.3854 18.362 19.673C17.7202 20 16.8802 20 15.2 20H8.8C7.11984 20 6.27976 20 5.63803 19.673C5.07354 19.3854 4.6146 18.9265 4.32698 18.362C4 17.7202 4 16.8802 4 15.2V10.2847Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M8 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Clock with a counter-clockwise arrow. Same 24 grid and 2px stroke as HomeIcon. */
export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M3 5V9H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3.51172 15C4.74723 18.4956 8.08094 21 11.9996 21C16.9702 21 20.9996 16.9706 20.9996 12C20.9996 7.02944 16.9702 3 11.9996 3C8.27045 3 5.07102 5.26806 3.70551 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Banknote. Same 24 grid and 2px stroke as the other nav icons. */
export function PaymentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M21 9C19.3431 9 18 7.65685 18 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 6C6 7.65685 4.65685 9 3 9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 18C18 16.3431 19.3431 15 21 15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 18C6 16.3431 4.65685 15 3 15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** Rounded box with three bullets. The bullets are filled, so they use fill, not stroke. */
export function ListIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M20 7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8.25 14.75C8.94036 14.75 9.5 15.3096 9.5 16C9.5 16.6904 8.94036 17.25 8.25 17.25C7.55964 17.25 7 16.6904 7 16C7 15.3096 7.55964 14.75 8.25 14.75Z" fill="currentColor" />
      <path d="M8.25 10.75C8.94036 10.75 9.5 11.3096 9.5 12C9.5 12.6904 8.94036 13.25 8.25 13.25C7.55964 13.25 7 12.6904 7 12C7 11.3096 7.55964 10.75 8.25 10.75Z" fill="currentColor" />
      <path d="M8.25 6.75C8.94036 6.75 9.5 7.30964 9.5 8C9.5 8.69036 8.94036 9.25 8.25 9.25C7.55964 9.25 7 8.69036 7 8C7 7.30964 7.55964 6.75 8.25 6.75Z" fill="currentColor" />
    </svg>
  );
}

/** Box with an arrow leaving its top-right corner: opens somewhere outside the app. */
export function ExternalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M9 6H8.8C7.11984 6 6.27976 6 5.63803 6.32698C5.07354 6.6146 4.6146 7.07354 4.32698 7.63803C4 8.27976 4 9.11984 4 10.8V15.2C4 16.8802 4 17.7202 4.32698 18.362C4.6146 18.9265 5.07354 19.3854 5.63803 19.673C6.27976 20 7.11984 20 8.8 20H13.2C14.8802 20 15.7202 20 16.362 19.673C16.9265 19.3854 17.3854 18.9265 17.673 18.362C18 17.7202 18 16.8802 18 15.2V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 4H20M20 4V10M20 4L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hash: an on-chain address or contract, and the row-number column. */
export function HashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M9 4L7 20M17 4L15 20M4 8H20M20 16H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Paper plane: sending a payment. */
export function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M6.00053 12.0001H9.00053M6.00053 12.0001L4.06701 5.87728C3.66804 4.61387 4.98317 3.49143 6.1682 4.08395L19.3173 10.6585C20.4228 11.2113 20.4228 12.789 19.3173 13.3418L6.1682 19.9163C4.98316 20.5088 3.66804 19.3863 4.06701 18.1229L6.00053 12.0001Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tray with an arrow curving down into it: bringing people in from a file. */
export function ImportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M3 9V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16V8C21 6.34315 19.6569 5 18 5H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 5H7C9.76142 5 12 7.23858 12 10V15M12 15L15.75 11.25M12 15L8.25 11.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Wallet with a card slot. */
export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M21 11V16C21 17.6569 19.6569 19 18 19H6C4.34315 19 3 17.6569 3 16V11M21 11H18M21 11V8C21 6.34315 19.6569 5 18 5H6C4.34315 5 3 6.34315 3 8V11M3 11H6M6 11H6.75736C7.55301 11 8.31607 11.3161 8.87868 11.8787L9.12132 12.1213C9.68393 12.6839 10.447 13 11.2426 13H12.7574C13.553 13 14.3161 12.6839 14.8787 12.1213L15.1213 11.8787C15.6839 11.3161 16.447 11 17.2426 11H18M6 11V8.5C6 8.22386 6.22386 8 6.5 8H17.5C17.7761 8 18 8.22386 18 8.5V11"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Calendar: a page with a header rule and day dots. The frame is a filled outline, so it uses fill. */
export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M7 4V3C4.79086 3 3 4.79086 3 7H4H5C5 5.89543 5.89543 5 7 5V4ZM7 4V5H17V4V3H7V4ZM17 4V5C18.1046 5 19 5.89543 19 7H20H21C21 4.79086 19.2091 3 17 3V4ZM20 7H19V8H20H21V7H20ZM20 8H19V17H20H21V8H20ZM20 17H19C19 18.1046 18.1046 19 17 19V20V21C19.2091 21 21 19.2091 21 17H20ZM17 20V19H7V20V21H17V20ZM7 20V19C5.89543 19 5 18.1046 5 17H4H3C3 19.2091 4.79086 21 7 21V20ZM4 17H5V8H4H3V17H4ZM4 8H5V7H4H3V8H4Z"
        fill="currentColor"
      />
      <path d="M4 8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.25 12C9.25 12.6904 8.69036 13.25 8 13.25C7.30964 13.25 6.75 12.6904 6.75 12C6.75 11.3096 7.30964 10.75 8 10.75C8.69036 10.75 9.25 11.3096 9.25 12Z" fill="currentColor" />
      <path d="M17.25 12C17.25 12.6904 16.6904 13.25 16 13.25C15.3096 13.25 14.75 12.6904 14.75 12C14.75 11.3096 15.3096 10.75 16 10.75C16.6904 10.75 17.25 11.3096 17.25 12Z" fill="currentColor" />
      <path d="M13.25 12C13.25 12.6904 12.6904 13.25 12 13.25C11.3096 13.25 10.75 12.6904 10.75 12C10.75 11.3096 11.3096 10.75 12 10.75C12.6904 10.75 13.25 11.3096 13.25 12Z" fill="currentColor" />
      <path d="M9.25 16C9.25 16.6904 8.69036 17.25 8 17.25C7.30964 17.25 6.75 16.6904 6.75 16C6.75 15.3096 7.30964 14.75 8 14.75C8.69036 14.75 9.25 15.3096 9.25 16Z" fill="currentColor" />
      <path d="M13.25 16C13.25 16.6904 12.6904 17.25 12 17.25C11.3096 17.25 10.75 16.6904 10.75 16C10.75 15.3096 11.3096 14.75 12 14.75C12.6904 14.75 13.25 15.3096 13.25 16Z" fill="currentColor" />
    </svg>
  );
}

/** Two sliders: opens the filters. */
export function FiltersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 10C16.6575 10 18 8.6575 18 7C18 5.3425 16.6575 4 15 4C13.3425 4 12 5.3425 12 7C12 8.6575 13.3425 10 15 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 7H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 7H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 20C10.6575 20 12 18.6575 12 17C12 15.3425 10.6575 14 9 14C7.3425 14 6 15.3425 6 17C6 18.6575 7.3425 20 9 20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M6 17H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 17H12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Plus: create or add. */
export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M12 5.5V12M12 12V18.5M12 12H5.5M12 12H18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Magnifying glass: search. */
export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 20L16.05 16.05" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Chevron pointing right: next, or "opens more". */
export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M9.5 18L15.5 12L9.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** ChevronRightIcon mirrored (x → 24 − x): previous. */
export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M14.5 18L8.5 12L14.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Tray with a down arrow. */
export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M20 15V17C20 18.6569 18.6569 20 17 20H7C5.34315 20 4 18.6569 4 17V15M12 14.5V4M12 14.5L8.5 11M12 14.5L15.5 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Two diagonal lines in the bottom-right corner: the textarea resize grip. */
export function ResizeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M15 21L21 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 21L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Close cross. */
export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Page with a folded corner: files and CSV uploads. */
export function FileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12.1716 3H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V9.82843C19 9.29799 18.7893 8.78929 18.4142 8.41421L13.5858 3.58579C13.2107 3.21071 12.702 3 12.1716 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 3.5V7C13 8.10457 13.8954 9 15 9H18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Two arrows meeting in one stem: split a total between people. */
export function SplitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 9V4M4 4H9M4 4L12 12M15 4H20M20 4V9M20 4L12 12M12 12V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Equals sign: the same amount for everyone. */
export function EqualIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M5 9H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 15H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Padlock with a keyhole. */
export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M5 13C5 11.3431 6.34315 10 8 10H16C17.6569 10 19 11.3431 19 13V18C19 19.6569 17.6569 21 16 21H8C6.34315 21 5 19.6569 5 18V13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 9.5V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Shield with a check. */
export function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M9 12L11 14L15 9.99999M10.7975 3.02606L5.79754 5.21356C4.70558 5.6913 4 6.77014 4 7.96204V13C4 17.4183 7.58172 21 12 21C16.4183 21 20 17.4183 20 13V7.96204C20 6.77014 19.2944 5.6913 18.2025 5.21356L13.2025 3.02606C12.4359 2.69069 11.5641 2.69069 10.7975 3.02606Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Paper plane: the send step. */
export function PaperPlaneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12.5916 20.8249C13.0032 22.2656 15.0401 22.279 15.4706 20.8438L19.9483 5.91824C20.2915 4.77403 19.2247 3.70722 18.0805 4.05048L3.15492 8.52816C1.7198 8.95869 1.7332 10.9956 3.17385 11.4072L9.69747 13.2711C10.1958 13.4135 10.5853 13.803 10.7277 14.3013L12.5916 20.8249Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Two overlapping squares, the back one dashed: copy. */
export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M9 8V9M14 3H16M21 8V10M16 15H15M19 3C20.1046 3 21 3.89543 21 5M21 13C21 14.1046 20.1046 15 19 15M9 5C9 3.89543 9.89543 3 11 3M12.75 9H5.25C4.00736 9 3 10.0074 3 11.25V18.75C3 19.9926 4.00736 21 5.25 21H12.75C13.9926 21 15 19.9926 15 18.75V11.25C15 10.0074 13.9926 9 12.75 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Lines with a plus: save as a list. */
export function ListPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 15L21 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 12V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Loop of two arrows around a plus: pay again. */
export function RepeatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M4 13V8C4 6.34315 5.34315 5 7 5H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 2.5L20 5L17.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 21.5L4 19L6.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19H17C18.6569 19 20 17.6569 20 16V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Shift key arrow, for keycaps. */
export function ShiftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M2.40406 11.2615L11.3257 3.11564C11.7076 2.76695 12.2924 2.76695 12.6743 3.11564L21.5959 11.2615C22.2702 11.8771 21.8347 13 20.9217 13H17V17C17 18.6569 15.6569 20 14 20H10C8.34315 20 7 18.6569 7 17V13H3.07832C2.16535 13 1.72984 11.8771 2.40406 11.2615Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Minus: remove or delete, like iOS edit mode; also the checkbox's "some selected" dash.
 *  Stroke on the svg so small uses can thicken it with `strokeWidth`. */
export function DeleteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      {...props}
    >
      <path d="M5.5 12H18.5" />
    </svg>
  );
}

/** Tick. Stroke is set on the svg so small uses (checkbox) can thicken it with `strokeWidth`. */
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M6 14.15L10.0321 18L18 7" />
    </svg>
  );
}

/** Filled circle with a tick knocked out: paid / confirmed. */
export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM15.5586 8.1709C15.1005 7.8626 14.4794 7.98355 14.1709 8.44141L10.4727 13.9336L8.70703 12.168C8.31651 11.7774 7.68349 11.7774 7.29297 12.168C6.90244 12.5585 6.90244 13.1915 7.29297 13.582L9.91797 16.207C10.1293 16.4183 10.4243 16.5239 10.7217 16.4951C11.0188 16.4662 11.2873 16.3062 11.4541 16.0586L15.8291 9.55859C16.1374 9.10055 16.0165 8.47937 15.5586 8.1709Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Two stacked cards with a person on the front one: a saved list of people. */
export function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M17 7V6C17 4.34315 15.6569 3 14 3H6C4.34315 3 3 4.34315 3 6V14C3 15.6569 4.34315 17 6 17H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 10C21 8.34315 19.6569 7 18 7H10C8.34315 7 7 8.34315 7 10V18C7 19.6569 8.34315 21 10 21H18C19.6569 21 21 19.6569 21 18V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 12.5C16 13.6046 15.1046 14.5 14 14.5C12.8954 14.5 12 13.6046 12 12.5C12 11.3954 12.8954 10.5 14 10.5C15.1046 10.5 16 11.3954 16 12.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.52734 21C9.77607 18.75 11.6836 17 13.9999 17C16.3162 17 18.2237 18.75 18.4724 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rounded cog: settings. */
export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M7.67668 5.32539L7.30515 5.23965C6.72652 5.10612 6.11991 5.28009 5.7 5.7C5.28009 6.11991 5.10612 6.72651 5.23965 7.30515L5.32539 7.67668C5.55082 8.65357 5.148 9.668 4.31382 10.2241L3.74885 10.6008C3.28101 10.9127 3 11.4377 3 12C3 12.5623 3.28101 13.0873 3.74885 13.3992L4.31382 13.7759C5.148 14.332 5.55082 15.3464 5.32539 16.3233L5.23965 16.6949C5.10612 17.2735 5.28009 17.8801 5.7 18.3C6.11991 18.7199 6.72651 18.8939 7.30515 18.7604L7.67668 18.6746C8.65357 18.4492 9.668 18.852 10.2241 19.6862L10.6008 20.2512C10.9127 20.719 11.4377 21 12 21C12.5623 21 13.0873 20.719 13.3992 20.2512L13.7759 19.6862C14.332 18.852 15.3464 18.4492 16.3233 18.6746L16.6949 18.7604C17.2735 18.8939 17.8801 18.7199 18.3 18.3C18.7199 17.8801 18.8939 17.2735 18.7604 16.6949L18.6746 16.3233C18.4492 15.3464 18.852 14.332 19.6862 13.7759L20.2512 13.3992C20.719 13.0873 21 12.5623 21 12C21 11.4377 20.719 10.9127 20.2512 10.6008L19.6862 10.2241C18.852 9.668 18.4492 8.65357 18.6746 7.67668L18.7604 7.30515C18.8939 6.72652 18.7199 6.11991 18.3 5.7C17.8801 5.28009 17.2735 5.10612 16.6949 5.23965L16.3233 5.32539C15.3464 5.55082 14.332 5.148 13.7759 4.31382L13.3992 3.74884C13.0873 3.28101 12.5623 3 12 3C11.4377 3 10.9127 3.28101 10.6008 3.74885L10.2241 4.31382C9.668 5.148 8.65357 5.55082 7.67668 5.32539Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Short dash: a list marker. */
export function DashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Envelope: email. */
export function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M21 8H20V16H21H22V8H21ZM6 5V6H18V5V4H6V5ZM3 16H4V8H3H2V16H3ZM18 19V18H6V19V20H18V19ZM3 16H2C2 18.2091 3.79086 20 6 20V19V18C4.89543 18 4 17.1046 4 16H3ZM6 5V4C3.79086 4 2 5.79086 2 8H3H4C4 6.89543 4.89543 6 6 6V5ZM21 16H20C20 17.1046 19.1046 18 18 18V19V20C20.2092 20 22 18.2091 22 16H21ZM21 8H22C22 5.79086 20.2092 4 18 4V5V6C19.1046 6 20 6.89543 20 8H21Z"
        fill="currentColor"
      />
      <path d="M21 8.5L13.3416 12.3292C12.497 12.7515 11.5029 12.7515 10.6583 12.3292L3 8.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** Warning triangle (user's icon). Stroke on the svg, like CheckIcon. */
export function WarningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      {...props}
    >
      <path d="M12 8.8846V11.9192M12 15H12.01M9.48223 4.43254L3.45153 14.3633C2.22395 16.3848 3.64405 19 5.9693 19H18.0307C20.3559 19 21.7761 16.3848 20.5485 14.3633L14.5178 4.43254C13.3578 2.52249 10.6422 2.52249 9.48223 4.43254ZM12.25 15C12.25 15.1381 12.1381 15.25 12 15.25C11.8619 15.25 11.75 15.1381 11.75 15C11.75 14.8619 11.8619 14.75 12 14.75C12.1381 14.75 12.25 14.8619 12.25 15Z" />
    </svg>
  );
}

/** Right arrow (user's icon), e.g. "Review payment →". Stroke on the svg, like CheckIcon. */
export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M14 6L20 12L14 18" />
      <path d="M19 12H4" />
    </svg>
  );
}

/** Command key (user's icon), for the ⌘ V hint. Stroke on the svg, like CheckIcon. */
export function CommandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      aria-hidden
      {...props}
    >
      <path d="M9 9V6.5C9 5.11929 7.88071 4 6.5 4C5.11929 4 4 5.11929 4 6.5C4 7.88071 5.11929 9 6.5 9H9ZM9 9H15M9 9V15M15 9V6.5C15 5.11929 16.1193 4 17.5 4C18.8807 4 20 5.11929 20 6.5C20 7.88071 18.8807 9 17.5 9H15ZM15 9V15M15 15H9M15 15V17.5C15 18.8807 16.1193 20 17.5 20C18.8807 20 20 18.8807 20 17.5C20 16.1193 18.8807 15 17.5 15H15ZM9 15V17.5C9 18.8807 7.88071 20 6.5 20C5.11929 20 4 18.8807 4 17.5C4 16.1193 5.11929 15 6.5 15H9Z" />
    </svg>
  );
}

/** Copy, two solid sheets (user's icon): the changelog's Copy link. Stroke on the svg, like CheckIcon. */
export function CopyLinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      {...props}
    >
      <path d="M16 16C16.93 16 17.395 16 17.7765 15.8978C18.8117 15.6204 19.6204 14.8117 19.8978 13.7765C20 13.395 20 12.93 20 12V8.8C20 7.11984 20 6.27976 19.673 5.63803C19.3854 5.07354 18.9265 4.6146 18.362 4.32698C17.7202 4 16.8802 4 15.2 4H12C11.07 4 10.605 4 10.2235 4.10222C9.18827 4.37962 8.37962 5.18827 8.10222 6.22354C8 6.60504 8 7.07003 8 8M16 12.8V15.2C16 16.8802 16 17.7202 15.673 18.362C15.3854 18.9265 14.9265 19.3854 14.362 19.673C13.7202 20 12.8802 20 11.2 20H8.8C7.11984 20 6.27976 20 5.63803 19.673C5.07354 19.3854 4.6146 18.9265 4.32698 18.362C4 17.7202 4 16.8802 4 15.2V12.8C4 11.1198 4 10.2798 4.32698 9.63803C4.6146 9.07354 5.07354 8.6146 5.63803 8.32698C6.27976 8 7.11984 8 8.8 8H11.2C12.8802 8 13.7202 8 14.362 8.32698C14.9265 8.6146 15.3854 9.07354 15.673 9.63803C16 10.2798 16 11.1198 16 12.8Z" />
    </svg>
  );
}
