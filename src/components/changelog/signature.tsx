"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

export type SignatureData = {
  width: number;
  height: number;
  /** One path per pen stroke, in drawing order; `length` in the same units. */
  strokes: { d: string; length: number }[];
};

/** Kurosawa's mark, from rndr-realm's lab notes (src/lib/data/signatures.ts). */
export const KUROSAWA_SIGNATURE: SignatureData = {
  width: 100,
  height: 56,
  strokes: [
    { length: 38.1, d: "M14 6 C13.8 8.7 13.5 15.7 13 22 C12.5 28.3 11.3 40.3 11 44" },
    {
      length: 243.3,
      d: "M30 8 C28.0 10.7 20.8 20.8 18 24 C15.2 27.2 12.3 26.0 13 27 C13.7 28.0 19.5 27.8 22 30 C24.5 32.2 26.0 38.0 28 40 C30.0 42.0 32.0 43.3 34 42 C36.0 40.7 38.7 34.7 40 32 C41.3 29.3 41.3 25.3 42 26 C42.7 26.7 42.7 34.7 44 36 C45.3 37.3 48.3 35.7 50 34 C51.7 32.3 53.0 26.0 54 26 C55.0 26.0 54.3 33.3 56 34 C57.7 34.7 61.7 31.7 64 30 C66.3 28.3 68.7 23.7 70 24 C71.3 24.3 70.3 31.0 72 32 C73.7 33.0 77.0 31.0 80 30 C83.0 29.0 87.3 26.0 90 26 C92.7 26.0 95.7 27.7 96 30 C96.3 32.3 96.3 37.3 92 40 C87.7 42.7 78.7 44.7 70 46 C61.3 47.3 48.0 47.8 40 48 C32.0 48.2 25.0 47.2 22 47",
    },
  ],
};

// Pen speed in signature units per second, and the lift between strokes (as in the labs page).
const SPEED = 150;
const LIFT = 0.12;
const HEIGHT = 48;

/** Each stroke's start and duration: one pen at SPEED, lifting briefly between strokes. */
function timeStrokes(strokes: SignatureData["strokes"]) {
  return strokes.reduce<(SignatureData["strokes"][number] & { start: number; duration: number })[]>((acc, s) => {
    const prev = acc[acc.length - 1];
    const start = prev ? prev.start + prev.duration + LIFT : 0;
    return [...acc, { ...s, start, duration: s.length / SPEED }];
  }, []);
}

/**
 * A signature that draws on like a pen, stroke after stroke, the first time it scrolls into
 * view (after the labs page's lab notes). Shown whole under reduced motion.
 */
export function Signature({ signature, label }: { signature: SignatureData; label: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const reduce = useReducedMotion();
  const { width, height, strokes } = signature;

  const timed = timeStrokes(strokes);

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      height={HEIGHT}
      width={(width / height) * HEIGHT}
      className="text-fg"
    >
      {timed.map((s) => (
        <motion.path
          key={s.d}
          d={s.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={inView || reduce ? { pathLength: 1, opacity: 1 } : undefined}
          transition={{
            pathLength: { delay: s.start, duration: s.duration, ease: [0.65, 0, 0.35, 1] },
            opacity: { delay: s.start, duration: 0.01 },
          }}
        />
      ))}
    </svg>
  );
}
