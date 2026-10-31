"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

import { authApi } from "@/lib/api/endpoints";
import type { AuthResponse } from "@/lib/api/types";

import { sessionAtom, sessionStore } from "./session";

const noop = () => () => {};

/** False during SSR and the first client render, so session-dependent UI never mismatches. */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function useSession() {
  const session = useAtomValue(sessionAtom);
  const hydrated = useHydrated();
  return {
    hydrated,
    session: hydrated ? session : null,
    user: hydrated ? (session?.user ?? null) : null,
    isAuthenticated: hydrated && !!session,
  };
}

export function useSignIn() {
  const qc = useQueryClient();
  return useCallback(
    (auth: AuthResponse) => {
      qc.clear();
      sessionStore.set({ user: auth.user, tokens: auth.tokens });
    },
    [qc],
  );
}

export function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    const session = sessionStore.get();
    sessionStore.set(null);
    qc.clear();
    router.replace("/sign-in");
    // Best effort: the session is gone locally either way.
    if (session) authApi.logout(session.tokens.refresh_token).catch(() => {});
  }, [qc, router]);
}
