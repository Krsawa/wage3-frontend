"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider as JotaiProvider, getDefaultStore } from "jotai";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { WagmiProvider } from "wagmi";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError, toApiError } from "@/lib/api/client";
import { wagmiConfig } from "@/lib/wagmi";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
    mutationMeta: {
      /** Set false when the caller shows the error inline instead of as a toast. */
      errorToast?: boolean;
    };
  }
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        // Background refetch failures only; first-load errors render inline.
        if (toApiError(error).isNetwork) toast.error("You're offline. Showing the last data we had.", { id: "offline" });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.errorToast === false) return;
        toast.error(toApiError(error).message);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        retry: (count, error) => {
          const e = toApiError(error);
          // 4xx won't fix itself on retry.
          if (e.status >= 400 && e.status < 500) return false;
          return count < 2;
        },
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <JotaiProvider store={getDefaultStore()}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
            {/* Every tooltip waits 400ms, even right after another one closes (no skip window). */}
            <TooltipProvider delayDuration={400} skipDelayDuration={0}>
              {children}
              <Toaster />
            </TooltipProvider>
          </MotionConfig>
          {process.env.NODE_ENV === "development" && (
            <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </WagmiProvider>
    </JotaiProvider>
  );
}
