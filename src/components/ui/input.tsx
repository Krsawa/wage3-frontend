import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

import { ResizeIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const base =
  "w-full rounded-xl border border-border-subtle bg-surface px-3.5 text-[15px] text-fg placeholder:text-fg-subtle " +
  "transition-[border-color,box-shadow] duration-150 outline-none " +
  "hover:border-border focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--danger)_18%,transparent)]";

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
      <div className="relative">
        <textarea
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(base, "block min-h-28 resize-y py-3 leading-relaxed [&::-webkit-resizer]:bg-transparent", className)}
          {...props}
        />
        <ResizeIcon className="pointer-events-none absolute right-1.5 bottom-1.5 size-3 text-fg-subtle" />
      </div>
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
        <label htmlFor={htmlFor} className="text-[13px] leading-5 font-medium text-fg">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-[13px] leading-5 text-danger-fg">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
