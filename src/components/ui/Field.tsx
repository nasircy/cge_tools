import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly suffix?: ReactNode;
}

export default function Field({ label, hint, error, suffix, id, ...props }: FieldProps) {
  const generated = useId();
  const inputId = id ?? `field-${generated}`;
  const describedBy =
    error !== undefined
      ? `${inputId}-error`
      : hint !== undefined
        ? `${inputId}-hint`
        : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy}
          className={`min-h-11 w-full rounded-lg border bg-[var(--surface)] px-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] ${suffix !== undefined ? "pr-12" : ""} ${error !== undefined ? "border-danger" : "border-[var(--border)]"}`}
          {...props}
        />
        {suffix !== undefined && (
          <span className="absolute inset-y-0 right-3 flex items-center text-[var(--ink-muted)]">
            {suffix}
          </span>
        )}
      </div>
      {hint !== undefined && error === undefined && (
        <p id={`${inputId}-hint`} className="text-sm text-[var(--ink-muted)]">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
