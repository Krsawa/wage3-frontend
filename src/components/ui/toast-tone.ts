/**
 * The two looks for the app's toasts (Sonner toasts, the selection toast, Unsaved changes).
 * Light is current: a shade darker than the white page with dark ink. Dark is the earlier
 * oklch(0.25) card with white ink, kept whole so it can come back by switching TOAST_TONE.
 */
export type ToastToneName = "light" | "dark";

export type ToastToneClasses = {
  /** The card: fill, ink, edge and shadow. */
  surface: string;
  /** Secondary text: totals, hints, descriptions. */
  muted: string;
  /** A text action (Undo, Set amount, Discard): its hover wash. */
  action: string;
  /** The one solid button (Done, Apply, Save changes). */
  primary: string;
  /** An input inside the toast (Set amount, Split). */
  input: string;
  /** Error text inside the toast. */
  error: string;
  /** An error toast's card (overrides `surface`). */
  errorSurface: string;
};

const LIGHT: ToastToneClasses = {
  surface: "bg-(--color-500) text-fg shadow-[0_0_0_1px_oklch(0_0_0/0.06),var(--shadow-lg)]",
  muted: "text-fg-muted",
  action: "hover:bg-[oklch(0_0_0/0.06)]",
  primary: "bg-surface text-fg shadow-(--shadow-xs) hover:bg-(--color-25)",
  input:
    "border-[oklch(0_0_0/0.1)] bg-(--color-50) text-fg placeholder:text-fg-subtle hover:border-[oklch(0_0_0/0.16)] focus:border-primary aria-invalid:border-(--red-7)",
  error: "text-danger-fg",
  errorSurface: "!bg-danger-soft !text-danger-fg",
};

const DARK: ToastToneClasses = {
  surface: "bg-[oklch(0.25_0_0)] text-white shadow-lg",
  muted: "text-white/75",
  action: "hover:bg-white/15",
  primary: "bg-white text-fg hover:bg-(--color-200)",
  input:
    "border-white/15 bg-white/10 text-white placeholder:text-white/50 hover:border-white/22 hover:bg-white/[0.12] focus:border-white/45 focus:bg-white/15 aria-invalid:border-[oklch(0.85_0.09_25)]",
  error: "text-[oklch(0.92_0.06_25)]",
  errorSurface: "!bg-(--red-10)",
};

export const TOAST_TONES: Record<ToastToneName, ToastToneClasses> = { light: LIGHT, dark: DARK };

/** The look in use. "dark" restores the earlier toasts everywhere. */
export const TOAST_TONE: ToastToneName = "light";

export const toastTone = TOAST_TONES[TOAST_TONE];
