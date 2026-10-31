"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/cn";
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
    <AuthShell>
      <Suspense fallback={<div className="grid h-80 place-items-center"><Spinner className="text-fg-subtle" /></div>}>
        <SignIn />
      </Suspense>
    </AuthShell>
  );
}

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { hydrated, isAuthenticated } = useSession();
  const signIn = useSignIn();

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
      signIn(auth);
      router.replace(next);
    },
  });

  return (
    <div>
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
    </div>
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
  const [google, setGoogle] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setLocalError("Enter a valid email address");
      return;
    }
    onSubmit();
  };

  const shownError = localError ?? error;

  return (
    <div>
      <h1 className="headline text-[30px]">Sign in to Wage3</h1>
      <p className="mt-2.5 text-[15px] text-fg-muted text-pretty">
        New or returning, it&apos;s the same step. We&apos;ll email you a 6-digit code.
      </p>

      <Button
        variant="outline"
        size="lg"
        className="mt-8 w-full"
        loading={google}
        onClick={() => {
          setGoogle(true);
          window.location.href = authApi.googleStartUrl;
        }}
      >
        <GoogleIcon /> Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-fg-subtle">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email" error={shownError}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            placeholder="you@company.com"
            leading={<Mail className="size-4" />}
            value={email}
            invalid={!!shownError}
            onChange={(e) => {
              setEmail(e.target.value);
              setLocalError(null);
              if (error) clearError();
            }}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-fg-subtle text-pretty">
        By continuing you agree to use Wage3 to send funds you control. We never hold your USDC.
      </p>
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
      <button
        type="button"
        onClick={onBack}
        className="pressable -ml-2 mb-6 inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Use a different email
      </button>
      <h1 className="headline text-[30px]">Check your email</h1>
      <p className="mt-2.5 text-[15px] text-fg-muted text-pretty">
        We sent a 6-digit code to <span className="font-medium text-fg break-all">{email}</span>. It expires in 10
        minutes.
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
              className={cn(
                "h-14 w-full min-w-0 rounded-xl border border-border bg-surface text-center font-mono text-2xl font-medium tabular outline-none",
                "transition-[border-color,box-shadow] duration-150 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)]",
                "disabled:opacity-60 aria-invalid:border-danger",
              )}
            />
          ))}
        </fieldset>

        <div className="mt-3 min-h-5 text-[13px]">
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

        <Button
          type="submit"
          size="lg"
          className="mt-4 w-full"
          loading={pending}
          disabled={digits.join("").length !== CODE_LENGTH}
        >
          Verify and sign in
        </Button>
      </form>

      <div className="mt-6 text-center text-[13px] text-fg-muted">
        {resendError && (
          <p role="alert" className="mb-2 text-danger-fg">
            {resendError}
          </p>
        )}
        Didn&apos;t get it?{" "}
        {secondsLeft > 0 ? (
          <span className="tabular text-fg-subtle">Resend in {secondsLeft}s</span>
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
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
