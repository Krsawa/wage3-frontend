"use client";

import { motion } from "motion/react";
import { ChevronRight, Wallet } from "lucide-react";
import { useConnect, useConnectors } from "wagmi";

import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

function friendlyConnectError(message: string) {
  if (/reject|denied|cancel/i.test(message)) return "You closed the wallet prompt. Try again when you're ready.";
  if (/not found|no provider|not installed/i.test(message)) return "We couldn't find that wallet in this browser.";
  return message.split("\n")[0];
}

export function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const connectors = useConnectors();
  const { connect, isPending, variables, error, reset } = useConnect({
    mutation: { onSuccess: () => onOpenChange(false) },
  });

  // EIP-6963 announces every installed wallet; drop the generic "Injected" if a named one exists.
  const named = connectors.filter((c) => c.id !== "injected");
  const list = named.length ? named : connectors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Connect a wallet"
      description="Choose the wallet that holds the USDC you're sending. Wage3 never holds your funds."
    >
      <ul className="flex flex-col gap-2">
        {list.map((c, i) => {
          const pending = isPending && variables?.connector === c;
          const isBase = c.id === "baseAccount";
          return (
            <motion.li
              key={c.uid}
              initial={{ opacity: 0, transform: "translateY(4px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{ delay: i * 0.04 }}
            >
              <button
                type="button"
                disabled={isPending}
                onClick={() => connect({ connector: c })}
                className={cn(
                  "pressable flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left",
                  "hover:border-border-strong hover:bg-surface-sunken disabled:opacity-60",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-muted">
                  {c.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.icon} alt="" className="size-10" />
                  ) : isBase ? (
                    <span className="size-5 rounded-[5px] bg-base-blue" />
                  ) : (
                    <Wallet className="size-5 text-fg-muted" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{isBase ? "Base Account" : c.name}</span>
                  <span className="block text-[13px] text-fg-subtle">
                    {isBase ? "Sign in with a passkey. No extension needed." : "Browser wallet"}
                  </span>
                </span>
                {pending ? <Spinner className="size-4 text-fg-muted" /> : <ChevronRight className="size-4 text-fg-subtle" />}
              </button>
            </motion.li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger-fg">
          {friendlyConnectError(error.message)}
        </p>
      )}
    </Dialog>
  );
}
