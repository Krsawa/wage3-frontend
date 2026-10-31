"use client";

import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Checkbox selection over an ordered list of keys. Shift-click selects a range,
 * like Gmail or Finder. Keys that disappear from `keys` drop out of the selection.
 */
export function useRowSelection(keys: string[], initial?: Iterable<string> | (() => Iterable<string>)) {
  const [raw, setRaw] = useState<Set<string>>(() => new Set(typeof initial === "function" ? initial() : initial));
  const anchor = useRef<number | null>(null);

  const selected = useMemo(() => {
    const live = new Set(keys);
    return new Set([...raw].filter((k) => live.has(k)));
  }, [raw, keys]);

  const toggle = useCallback(
    (key: string, on: boolean, shiftKey = false) => {
      const index = keys.indexOf(key);
      setRaw((prev) => {
        const next = new Set(prev);
        if (shiftKey && anchor.current !== null && anchor.current < keys.length) {
          const [from, to] = [anchor.current, index].sort((a, b) => a - b);
          for (const k of keys.slice(from, to + 1)) {
            if (on) next.add(k);
            else next.delete(k);
          }
        } else if (on) next.add(key);
        else next.delete(key);
        return next;
      });
      anchor.current = index;
    },
    [keys],
  );

  const setAll = useCallback(
    (on: boolean) => {
      setRaw(on ? new Set(keys) : new Set());
      anchor.current = null;
    },
    [keys],
  );

  const replace = useCallback((next: Iterable<string>) => {
    setRaw(new Set(next));
    anchor.current = null;
  }, []);

  const count = selected.size;
  return {
    selected,
    count,
    isAll: keys.length > 0 && count === keys.length,
    isSome: count > 0 && count < keys.length,
    toggle,
    setAll,
    clear: () => setAll(false),
    replace,
  };
}
