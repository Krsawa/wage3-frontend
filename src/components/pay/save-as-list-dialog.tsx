"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useSaveAsList } from "@/lib/api/queries";
import type { Payout } from "@/lib/api/types";
import { pluralize } from "@/lib/format";

export function SaveAsListDialog({ payout, open, onOpenChange }: { payout: Payout; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [name, setName] = useState(payout.name);
  const save = useSaveAsList(payout.id, { meta: { errorToast: false } });
  const unique = new Set(payout.items.map((i) => i.wallet_address)).size;
  const trimmed = name.trim();
  const error = save.error?.message ?? (trimmed.length > 100 ? "At most 100 characters" : null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) save.reset();
        onOpenChange(o);
      }}
      dismissible={!save.isPending}
      title="Save as a list"
      description={`Keep these ${pluralize(unique, "person", "people")} and their amounts so you can pay them again in a couple of clicks.`}
    >
      <form
        id="save-as-list"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed || trimmed.length > 100) return;
          save.mutate(trimmed, {
            onSuccess: (list) => {
              onOpenChange(false);
              toast.success("List saved", {
                action: { label: "Open", onClick: () => router.push(`/lists/${list.id}`) },
              });
            },
          });
        }}
      >
        <Field label="List name" htmlFor="list-name" error={error}>
          <Input
            id="list-name"
            autoFocus
            value={name}
            maxLength={120}
            invalid={!!error}
            onChange={(e) => {
              setName(e.target.value);
              save.reset();
            }}
          />
        </Field>
        {unique < payout.items.length && (
          <p className="mt-3 text-[13px] text-fg-muted">
            Wallets paid more than once are kept once, with their first amount.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="inverse" loading={save.isPending} disabled={!trimmed}>
            Save list
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
