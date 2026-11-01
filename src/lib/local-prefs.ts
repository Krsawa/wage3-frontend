"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Small per-browser store for things the API doesn't hold yet (list logos, company details).
 * Survives reloads on this device only; move each key to the backend when it gets a field.
 */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = () => l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage full or blocked: the value just doesn't persist.
  }
  emit();
}

export function useLocalValue(key: string) {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);
  const set = useCallback((v: string | null) => write(key, v), [key]);
  return [value, set] as const;
}

/** A list's logo as a data URL, or null. */
export const useListLogo = (listId: string) => useLocalValue(`wage3.list-logo.${listId}`);

export type Company = { logo: string | null; name: string; email: string };
export function useCompany() {
  const [raw, setRaw] = useLocalValue("wage3.company");
  let company: Company = { logo: null, name: "", email: "" };
  try {
    if (raw) company = { ...company, ...(JSON.parse(raw) as Partial<Company>) };
  } catch {
    // Ignore a corrupt value.
  }
  const update = useCallback(
    (patch: Partial<Company>) => setRaw(JSON.stringify({ ...company, ...patch })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, setRaw],
  );
  return [company, update] as const;
}

/** Reads the company straight from storage, for code outside React (exports). */
export function readCompany(): Company | null {
  const raw = typeof window === "undefined" ? null : read("wage3.company");
  try {
    return raw ? (JSON.parse(raw) as Company) : null;
  } catch {
    return null;
  }
}
