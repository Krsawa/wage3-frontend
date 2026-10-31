"use client";

import { useQueryClient } from "@tanstack/react-query";
import { atom, useAtom, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { qk, useCreateList } from "@/lib/api/queries";
import type { ListSummary } from "@/lib/api/types";

const DEFAULT_NAME = "Untitled list";

/** The list just created from "New list": its page opens with the name selected for renaming. */
const freshListIdAtom = atom<string | null>(null);

/** "Untitled list", or "Untitled list 2" etc. if that's taken, based on the lists already loaded. */
function nextDefaultName(lists: ListSummary[]) {
  const taken = new Set(lists.map((l) => l.name.trim().toLowerCase()));
  if (!taken.has(DEFAULT_NAME.toLowerCase())) return DEFAULT_NAME;
  let n = 2;
  while (taken.has(`${DEFAULT_NAME} ${n}`.toLowerCase())) n++;
  return `${DEFAULT_NAME} ${n}`;
}

/** No dialog: creates a list with a default name and opens it straight away. */
export function useCreateListNow() {
  const router = useRouter();
  const qc = useQueryClient();
  const create = useCreateList();
  const setFresh = useSetAtom(freshListIdAtom);

  const createNow = useCallback(() => {
    if (create.isPending) return;
    const cached = qc.getQueriesData<ListSummary[]>({ queryKey: qk.listsRoot }).flatMap(([, d]) => d ?? []);
    create.mutate(
      { name: nextDefaultName(cached), recipients: [] },
      {
        onSuccess: (list) => {
          setFresh(list.id);
          router.push(`/lists/${list.id}`);
        },
      },
    );
  }, [create, qc, router, setFresh]);

  return { createNow, isCreating: create.isPending };
}

/** True once for a list created by useCreateListNow; call `consume` after acting on it. */
export function useFreshList(id: string) {
  const [fresh, setFresh] = useAtom(freshListIdAtom);
  const consume = useCallback(() => setFresh(null), [setFresh]);
  return { isFresh: fresh === id, consume };
}
