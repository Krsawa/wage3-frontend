"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useSession } from "@/lib/auth/use-session";

import { historyApi, listsApi, payoutsApi, statusApi, usersApi } from "./endpoints";
import type {
  CreatePayoutInput,
  DateRangeQuery,
  ListDetail,
  Payout,
  PayoutItemInput,
  RecipientInput,
  SentHistoryQuery,
} from "./types";

export const qk = {
  status: ["status"] as const,
  me: ["me"] as const,
  stats: (q?: DateRangeQuery) => ["me", "stats", q ?? {}] as const,
  lists: (search?: string) => ["lists", { search: search ?? "" }] as const,
  listsRoot: ["lists"] as const,
  list: (id: string) => ["list", id] as const,
  payout: (id: string) => ["payout", id] as const,
  historyRoot: ["history"] as const,
  history: (q?: SentHistoryQuery) => ["history", q ?? {}] as const,
};

// ---- Queries ----

/** Public. Polls so a paused banner appears/disappears without a reload. */
export function useAppStatus() {
  return useQuery({
    queryKey: qk.status,
    queryFn: statusApi.get,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMe() {
  const { isAuthenticated } = useSession();
  return useQuery({ queryKey: qk.me, queryFn: usersApi.me, enabled: isAuthenticated });
}

export function useStats(q?: DateRangeQuery) {
  return useQuery({
    queryKey: qk.stats(q),
    queryFn: () => usersApi.stats(q),
    placeholderData: keepPreviousData,
  });
}

export function useLists(search?: string) {
  return useQuery({
    queryKey: qk.lists(search),
    queryFn: () => listsApi.all(search),
    placeholderData: keepPreviousData,
  });
}

export function useList(id: string | undefined) {
  return useQuery({
    queryKey: qk.list(id ?? ""),
    queryFn: () => listsApi.get(id!),
    enabled: !!id,
  });
}

/** Polls while anything is on its way on-chain; the indexer confirms within ~a minute. */
export function usePayout(id: string | undefined) {
  return useQuery({
    queryKey: qk.payout(id ?? ""),
    queryFn: () => payoutsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const p = query.state.data;
      if (!p) return false;
      const inFlight = p.status === "submitted" || p.batches.some((b) => b.status === "submitted");
      return inFlight ? 4_000 : false;
    },
  });
}

/** Refetches every 10s while any row on the page is still on its way on-chain. */
export function useSentHistory(q?: SentHistoryQuery, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.history(q),
    queryFn: () => historyApi.sent(q),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.items.some((p) => p.status === "submitted") ? 10_000 : false,
  });
}

// ---- Mutations ----

/** Pass `{ meta: { errorToast: false } }` when the caller shows errors inline. */
type MutationOpts = { meta?: { errorToast?: boolean } };

function useListCache() {
  const qc = useQueryClient();
  return (list: ListDetail) => {
    qc.setQueryData(qk.list(list.id), list);
    qc.invalidateQueries({ queryKey: qk.listsRoot });
  };
}

export function useCreateList(opts?: MutationOpts) {
  const sync = useListCache();
  return useMutation({
    ...opts,
    mutationFn: listsApi.create,
    onSuccess: sync,
  });
}

export function useRenameList(id: string, opts?: MutationOpts) {
  const sync = useListCache();
  return useMutation({
    ...opts,
    mutationFn: (name: string) => listsApi.rename(id, name),
    onSuccess: sync,
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listsApi.remove(id),
    onSuccess: (_msg, id) => {
      qc.removeQueries({ queryKey: qk.list(id) });
      qc.invalidateQueries({ queryKey: qk.listsRoot });
    },
  });
}

export function useAddRecipients(id: string) {
  const sync = useListCache();
  return useMutation({
    mutationFn: (recipients: RecipientInput[]) => listsApi.addRecipients(id, recipients),
    onSuccess: sync,
  });
}

export function useReplaceRecipients(id: string, opts?: MutationOpts) {
  const sync = useListCache();
  return useMutation({
    ...opts,
    mutationFn: (recipients: RecipientInput[]) => listsApi.replaceRecipients(id, recipients),
    onSuccess: sync,
  });
}

function usePayoutCache() {
  const qc = useQueryClient();
  return (payout: Payout) => {
    qc.setQueryData(qk.payout(payout.id), payout);
    if (payout.status !== "draft" && payout.status !== "ready") {
      qc.invalidateQueries({ queryKey: qk.historyRoot });
      qc.invalidateQueries({ queryKey: ["me", "stats"] });
    }
  };
}

export function useCreatePayout(opts?: MutationOpts) {
  const sync = usePayoutCache();
  return useMutation({
    ...opts,
    mutationFn: (body: CreatePayoutInput) => payoutsApi.create(body),
    onSuccess: sync,
  });
}

export function useRenamePayout(id: string, opts?: MutationOpts) {
  const sync = usePayoutCache();
  return useMutation({
    ...opts,
    mutationFn: (name: string) => payoutsApi.rename(id, name),
    onSuccess: sync,
  });
}

export function useUpdatePayoutItems(id: string, opts?: MutationOpts) {
  const sync = usePayoutCache();
  return useMutation({
    ...opts,
    mutationFn: (items: PayoutItemInput[]) => payoutsApi.updateItems(id, items),
    onSuccess: sync,
  });
}

export function usePreparePayout(id: string) {
  const sync = usePayoutCache();
  return useMutation({
    mutationFn: (sender: string) => payoutsApi.prepare(id, sender),
    onSuccess: sync,
  });
}

export function useSubmitBatch(id: string) {
  const sync = usePayoutCache();
  return useMutation({
    mutationFn: ({ batchId, txHash }: { batchId: string; txHash: string }) =>
      payoutsApi.submitBatch(id, batchId, txHash),
    onSuccess: sync,
  });
}

export function useSaveAsList(payoutId: string, opts?: MutationOpts) {
  const qc = useQueryClient();
  return useMutation({
    ...opts,
    mutationFn: (name: string) => payoutsApi.saveAsList(payoutId, name),
    onSuccess: (list) => {
      qc.setQueryData(qk.list(list.id), list);
      qc.invalidateQueries({ queryKey: qk.listsRoot });
      qc.invalidateQueries({ queryKey: qk.payout(payoutId) });
    },
  });
}
