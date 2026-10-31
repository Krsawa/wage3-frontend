import { getDefaultStore } from "jotai";
import { atomWithStorage } from "jotai/utils";

import type { AuthTokens, User } from "@/lib/api/types";

export type Session = {
  user: User;
  tokens: AuthTokens;
};

const STORAGE_KEY = "wage3.session";

/**
 * Persisted in localStorage and synced across tabs (atomWithStorage listens to
 * `storage` events), so signing out in one tab signs out everywhere.
 */
export const sessionAtom = atomWithStorage<Session | null>(STORAGE_KEY, null, undefined, {
  getOnInit: true,
});

// The axios interceptors live outside React, so they read the same store directly.
const store = getDefaultStore();

export const sessionStore = {
  get: () => store.get(sessionAtom),
  set: (session: Session | null) => store.set(sessionAtom, session),
  setTokens: (tokens: AuthTokens) => {
    const current = store.get(sessionAtom);
    if (current) store.set(sessionAtom, { ...current, tokens });
  },
  setUser: (user: User) => {
    const current = store.get(sessionAtom);
    if (current) store.set(sessionAtom, { ...current, user });
  },
  /** Straight from localStorage: another tab may have rotated the tokens. */
  readPersisted: (): Session | null => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
};
