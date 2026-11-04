"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LAST_SIGN_IN } from "@/lib/auth/last-sign-in";
import { useLocalValue } from "@/lib/local-prefs";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/cn";
import { DISPLAY_TEXT } from "@/lib/type";
import { useSession, useSignIn } from "@/lib/auth/use-session";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only same-origin paths: "/lists" yes, "//evil.com" or "https://…" no. */
function safeNext(next: string | null) {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  return "/dashboard";
}

const stepMotion = {
  initial: { opacity: 0, filter: "blur(4px)", transform: "translateY(6px)" },
  animate: { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" },
  exit: { opacity: 0, filter: "blur(4px)", transform: "translateY(-4px)", transition: { duration: 0.12 } },
  transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div className="grid h-80 place-items-center">
            <Spinner className="text-fg-subtle" />
          </div>
        </AuthShell>
      }
    >
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { hydrated, isAuthenticated } = useSession();
  const signIn = useSignIn();
  const [, setLastSignIn] = useLocalValue(LAST_SIGN_IN);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  // Bumped on a wrong code: remounts the code boxes empty and focused.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (hydrated && isAuthenticated && !redirecting) router.replace(next);
  }, [hydrated, isAuthenticated, next, router, redirecting]);

  const start = useMutation({
    mutationFn: (e: string) => authApi.emailStart(e),
    meta: { errorToast: false },
    onSuccess: () => {
      setStep("code");
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
    },
  });

  const verify = useMutation({
    mutationFn: (code: string) => authApi.emailVerify(email, code),
    meta: { errorToast: false },
    onError: () => setAttempt((a) => a + 1),
    onSuccess: (auth) => {
      setRedirecting(true);
      setLastSignIn("email");
      signIn(auth);
      router.replace(next);
    },
  });

  return (
    <AuthShell
      footer={
        // Google is a way in, not a way past the code: it leaves once an email code is on its way.
        <AnimatePresence initial={false}>
          {step === "email" && (
            <motion.div key="google" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <GooglePill />
            </motion.div>
          )}
        </AnimatePresence>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.div key="email" {...stepMotion}>
            <EmailStep
              email={email}
              setEmail={setEmail}
              pending={start.isPending}
              error={start.error?.message}
              onSubmit={() => start.mutate(email.trim())}
              clearError={() => start.reset()}
            />
          </motion.div>
        ) : (
          <motion.div key="code" {...stepMotion}>
            <CodeStep
              key={attempt}
              email={email}
              pending={verify.isPending || redirecting}
              error={verify.error?.message}
              clearError={() => verify.reset()}
              onSubmit={(code) => verify.mutate(code)}
              resendAt={resendAt}
              resendPending={start.isPending}
              resendError={start.error?.message}
              onResend={() => start.mutate(email.trim())}
              onBack={() => {
                verify.reset();
                start.reset();
                setStep("email");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

function EmailStep({
  email,
  setEmail,
  pending,
  error,
  onSubmit,
  clearError,
}: {
  email: string;
  setEmail: (v: string) => void;
  pending: boolean;
  error?: string;
  onSubmit: () => void;
  clearError: () => void;
}) {
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setLocalError("Enter a valid email address");
      return;
    }
    onSubmit();
  };

  const shownError = localError ?? error;
  const ready = /@[^@\s]+\./.test(email) || pending;

  return (
    <div>
      {/* Centred under the mark, after Aave Account: title and subtitle read as one item (4px). */}
      <h1 className={cn(DISPLAY_TEXT, "text-center text-[22px] leading-7 font-semibold tracking-[-0.02em]")}>Welcome to Wage3</h1>
      <p className={cn(DISPLAY_TEXT, "mt-1 text-center text-[15px] text-fg-muted text-pretty")}>Log in or sign up to get started.</p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
        {/* A filled field, no label (the placeholder and aria-label name it), as in the reference. */}
        <Field htmlFor="email" error={shownError}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-label="Email"
            placeholder="Email address"
            className="h-12 rounded-full border-transparent bg-(--color-400) px-5 font-medium hover:border-transparent"
            value={email}
            invalid={!!shownError}
            onChange={(e) => {
              setEmail(e.target.value);
              setLocalError(null);
              if (error) clearError();
            }}
          />
        </Field>
        {/* One slot for the note and the button. Until the email reaches its domain's "."
            (you@company.) the note sits here; then it lifts away and Continue bounces up into
            its place. Enter still submits either way. */}
        <div className="relative h-12">
          <motion.p
            initial={false}
            animate={ready ? { opacity: 0, transform: "translateY(-6px)" } : { opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            aria-hidden={ready}
            className="pointer-events-none absolute inset-0 grid place-items-center text-center text-[13px] text-fg-subtle"
          >
            We&apos;ll sign you up if you don&apos;t have an account yet.
          </motion.p>
          <motion.div
            initial={false}
            animate={ready ? { opacity: 1, transform: "translateY(0px)" } : { opacity: 0, transform: "translateY(16px)" }}
            transition={ready ? { type: "spring", duration: 0.5, bounce: 0.4 } : { duration: 0.14 }}
            aria-hidden={!ready}
            className={cn("absolute inset-0", !ready && "pointer-events-none")}
          >
            <Button type="submit" variant="inverse" size="lg" className="w-full" loading={pending} tabIndex={ready ? 0 : -1}>
              Continue
            </Button>
          </motion.div>
        </div>
      </form>

    </div>
  );
}

function CodeStep({
  email,
  pending,
  error,
  clearError,
  onSubmit,
  resendAt,
  resendPending,
  resendError,
  onResend,
  onBack,
}: {
  email: string;
  pending: boolean;
  error?: string;
  clearError: () => void;
  onSubmit: (code: string) => void;
  resendAt: number;
  resendPending: boolean;
  resendError?: string;
  onResend: () => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const lastSubmitted = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const commit = (next: string[]) => {
    setDigits(next);
    if (error) clearError();
    const code = next.join("");
    if (code.length === CODE_LENGTH && !next.includes("") && lastSubmitted.current !== code) {
      lastSubmitted.current = code;
      onSubmit(code);
    }
  };

  const fill = (start: number, chars: string) => {
    const next = [...digits];
    let i = start;
    for (const c of chars) {
      if (i >= CODE_LENGTH) break;
      next[i++] = c;
    }
    commit(next);
    refs.current[Math.min(i, CODE_LENGTH - 1)]?.focus();
  };

  const onChange = (i: number, value: string) => {
    const only = value.replace(/\D/g, "");
    if (!only) {
      const next = [...digits];
      next[i] = "";
      commit(next);
      return;
    }
    fill(i, only);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      commit(next);
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    fill(0, text.slice(0, CODE_LENGTH));
  };

  return (
    <div>
      {/* Same head as the email step, so the title stays put when the step changes. */}
      <h1 className={cn(DISPLAY_TEXT, "text-center text-[22px] leading-7 font-semibold tracking-[-0.02em]")}>Check your email</h1>
      <p className={cn(DISPLAY_TEXT, "mt-1 text-center text-[15px] text-fg-muted text-pretty")}>
        Enter the code we sent to <span className="font-medium text-fg break-all">{email}</span>
      </p>

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          const code = digits.join("");
          if (code.length === CODE_LENGTH) onSubmit(code);
        }}
      >
        <fieldset disabled={pending} className="flex justify-between gap-2" aria-label="6-digit code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={CODE_LENGTH}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={!!error || undefined}
              // Grey wells like the email field; the one being typed in turns white with a dark edge.
              className={cn(
                "h-14 w-full min-w-0 rounded-2xl border border-transparent bg-(--color-400) text-center font-mono text-2xl font-medium tabular outline-none [corner-shape:superellipse(1.5)]",
                "transition-[border-color,background-color] duration-150 focus:border-(--color-900) focus:bg-surface",
                "disabled:opacity-60 aria-invalid:border-danger aria-invalid:bg-danger-soft",
              )}
            />
          ))}
        </fieldset>

        <div className="mt-3 min-h-5 text-center text-[13px]">
          {pending ? (
            <span className="inline-flex items-center gap-2 text-fg-muted">
              <Spinner className="size-3.5" /> Verifying…
            </span>
          ) : error ? (
            <span role="alert" className="text-danger-fg">
              {error}
            </span>
          ) : process.env.NODE_ENV === "development" ? (
            <span className="text-fg-subtle">Dev: the code is printed in the backend logs</span>
          ) : null}
        </div>

      </form>

      {/* No Verify button: the sixth digit submits. Resend and going back share one quiet line. */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
        {resendError && (
          <p role="alert" className="mb-1 basis-full text-center text-danger-fg">
            {resendError}
          </p>
        )}
        {secondsLeft > 0 ? (
          <span className="tabular text-fg-subtle">Resend code in {secondsLeft}s</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resendPending}
            className="font-medium text-fg underline-offset-4 hover:underline disabled:opacity-50"
          >
            {resendPending ? "Sending…" : "Resend code"}
          </button>
        )}
        <span aria-hidden className="text-fg-subtle">·</span>
        <button type="button" onClick={onBack} className="font-medium text-fg underline-offset-4 hover:underline">
          Use a different email
        </button>
      </div>
    </div>
  );
}

/**
 * Google log-in as the pill at the foot of the page (after Aave Account's). "Last used" shows
 * when Google was this browser's last way in (set on click and again by the callback).
 */
function GooglePill() {
  const [last, setLast] = useLocalValue(LAST_SIGN_IN);
  const [going, setGoing] = useState(false);
  const lastUsed = last === "google";
  return (
    <button
      type="button"
      onClick={() => {
        setGoing(true);
        // Recorded on the way out: Google's return trip lands on whichever frontend the backend
        // is configured for, so the callback can't be relied on to write it here.
        setLast("google");
        window.location.href = authApi.googleStartUrl;
      }}
      disabled={going}
      className="pressable relative inline-flex h-10 items-center gap-2.5 rounded-full bg-surface px-4 text-[14px] font-medium shadow-(--shadow-xs) hover:shadow-(--shadow-sm) disabled:opacity-70"
    >
      {going ? <Spinner className="size-4.5" /> : <GoogleIcon />}
      Continue with Google
      {/* A badge on the top-right corner, from the Figma frame: #606cec fill, 1px #d5e0ff edge,
          24px tall, 8/5 padding, 12px radius (as oklch),
          straddling the edge so it reads as a tag on the button, not part of its label. */}
      {lastUsed && (
        <span className="absolute -top-3 -right-5 inline-flex h-6 items-center rounded-[12px] border border-[oklch(0.908_0.044_270)] bg-[oklch(0.59_0.191_274.9)] px-2 py-[5px] text-[12px] leading-none font-medium shadow-(--shadow-xs)">
          <Shimmer tone="light">Last used</Shimmer>
        </span>
      )}
    </button>
  );
}

/**
 * Antalik's t-shimmer, adapted for light grounds: muted ink with a near-black band sweeping
 * across every 2s (a 90° gradient clipped to the text, its position animated). Still under
 * reduced motion.
 */
function Shimmer({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "light" }) {
  const reduce = useReducedMotion();
  // Dark: muted ink with a near-black band. Light (on a coloured badge): soft white, white band.
  const [base, peak] = tone === "light" ? ["oklch(1 0 0 / 0.72)", "oklch(1 0 0)"] : ["var(--fg-muted)", "var(--fg)"];
  return (
    <motion.span
      className="bg-clip-text text-transparent"
      style={{
        backgroundImage:
          `linear-gradient(90deg, ${base} 0%, ${base} 40%, ${peak} 50%, ${base} 60%, ${base} 100%)`,
        backgroundSize: "400% 100%",
        backgroundPosition: "100% 0",
      }}
      animate={reduce ? undefined : { backgroundPosition: ["100% 0", "0% 0"] }}
      transition={{ duration: 2, ease: "linear", repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden>
      <path fill="oklch(0.63 0.18 260)" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="oklch(0.648 0.16 148.5)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="oklch(0.83 0.17 84)" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="oklch(0.626 0.206 29.1)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
