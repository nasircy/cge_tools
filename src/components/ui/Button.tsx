import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  readonly variant?: Variant;
  readonly size?: "sm" | "md";
  readonly loading?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-700",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)]",
  ghost: "text-[var(--ink-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]",
  danger: "bg-danger text-white hover:opacity-90",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${variantClasses[variant]} ${size === "sm" ? "min-h-9 px-3 text-sm" : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
