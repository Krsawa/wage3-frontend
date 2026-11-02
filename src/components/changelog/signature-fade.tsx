"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

// Blur starts this far below the sticky title and authors, and is full when the signature meets them.
const RANGE = 240;
const MAX_BLUR = 10;

/**
 * Wraps an entry's signature at the foot of the left column. As the page scrolls it rises toward
 * the sticky title and authors (marked data-entry-head) and blurs progressively: sharp at RANGE
 * away, fully blurred by the time it reaches them. Styles are written directly, once per frame.
 */
export function SignatureFade({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    const head = el?.closest("li")?.querySelector<HTMLElement>("[data-entry-head]");
    if (!el || !head || reduce) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const gap = el.getBoundingClientRect().top - head.getBoundingClientRect().bottom;
      const t = Math.min(1, Math.max(0, 1 - gap / RANGE));
      el.style.filter = t ? `blur(${(t * MAX_BLUR).toFixed(2)}px)` : "";
      el.style.opacity = t ? String(1 - t * 0.6) : "";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduce]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
