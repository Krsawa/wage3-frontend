/**
 * Inter Display (Inter's opsz axis at 32, loaded in app/layout.tsx) for money and counts.
 * A class string rather than an @utility: Tailwind wouldn't emit the @utility version.
 * Pair with a size, e.g. `cn(DISPLAY_FIGURE, "text-[24px]")`. The line height is written as
 * `[line-height:1]`, not `leading-none`: tailwind-merge drops a `leading-*` class when a font
 * size follows it, which left every figure on the body's 1.5. Override it the same way
 * (`[line-height:28px]`), since a `leading-*` class wouldn't replace it.
 */
export const DISPLAY_FIGURE =
  "font-[family-name:var(--font-inter)] [line-height:1] font-medium tracking-[-0.02em] tabular [font-variation-settings:'opsz'_32]";

/**
 * Inter Display for words (tabs, short labels): same optical size as DISPLAY_FIGURE, without
 * the figure-only settings (tabular, line-height 1). Pair with a size and weight.
 */
export const DISPLAY_TEXT = "font-[family-name:var(--font-inter)] tracking-[-0.01em] [font-variation-settings:'opsz'_32]";
