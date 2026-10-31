import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const base =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] text-fg placeholder:text-fg-subtle " +
  "transition-[border-color,box-shadow] duration-150 outline-none " +
  "hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_3px_var(--danger-soft)]";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, invalid, ...props },
  ref,
) {
  if (!leading && !trailing) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(base, "h-11", className)} {...props} />;
  }
  return (
    <div className="relative flex items-center">
      {leading && (
        <span className="pointer-events-none absolute left-3.5 flex text-fg-subtle">{leading}</span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(base, "h-11", leading && "pl-10", trailing && "pr-12", className)}
        {...props}
      />
      {trailing && <span className="absolute right-2 flex items-center">{trailing}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(base, "min-h-28 py-3 leading-relaxed", className)}
        {...props}
      />
    );
  },
);

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-danger-fg">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
