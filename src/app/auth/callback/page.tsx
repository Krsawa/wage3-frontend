"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { useSignIn } from "@/lib/auth/use-session";
import { WarningIcon } from "@/components/ui/icons";

const ERRORS: Record<string, string> = {
  access_denied: "You cancelled Google sign-in.",
  google_sign_in_failed: "Google sign-in didn't go through. Please try again.",
};

export default function GoogleCallbackPage() {
  return (
    <AuthShell>
      <Suspense fallback={<Loading />}>
        <Callback />
      </Suspense>
    </AuthShell>
  );
}

function Loading() {
  return (
    <div role="status" className="flex flex-col items-center py-16 text-center">
      <Spinner className="size-6 text-primary" />
      <p className="mt-4 text-[15px] text-fg-muted">Signing you in…</p>
    </div>
  );
}

function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const signIn = useSignIn();
  const ticket = params.get("ticket");
  const errorCode = params.get("error");

  const [error, setError] = useState<string | null>(() => {
    if (errorCode) return ERRORS[errorCode] ?? ERRORS.google_sign_in_failed;
    if (!ticket) return "This sign-in link is missing its ticket. Start again from the sign-in page.";
    return null;
  });

  // Tickets are one-time: strict mode's double effect must not spend it twice.
  const exchanged = useRef(false);

  useEffect(() => {
    if (!ticket || errorCode || exchanged.current) return;
    exchanged.current = true;
    authApi
      .googleExchange(ticket)
      .then((auth) => {
        signIn(auth);
        router.replace("/dashboard");
      })
      .catch((e) => {
        const err = toApiError(e);
        setError(
          err.isUnauthorized
            ? "This sign-in link has expired or was already used. Please sign in again."
            : err.message,
        );
      });
  }, [ticket, errorCode, signIn, router]);

  if (!error) return <Loading />;

  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      role="alert"
      className="rounded-3xl border border-border bg-surface p-8 text-center"
    >
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger-fg">
        <WarningIcon className="size-5" />
      </div>
      <h1 className="mt-5 text-lg font-semibold tracking-[-0.02em]">Couldn&apos;t sign you in</h1>
      <p className="mt-2 text-sm text-fg-muted text-pretty">{error}</p>
      <Button asChild variant="inverse" className="mt-6 w-full">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </motion.div>
  );
}
