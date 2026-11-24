import type { ReactNode } from "react";

interface CardProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export default function Card({ title, subtitle, action, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-panel border border-[var(--border)] bg-[var(--surface)] shadow-sm ${className}`}>
      {(title !== undefined || action !== undefined) && (
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            {title !== undefined && <h2 className="text-base font-bold">{title}</h2>}
            {subtitle !== undefined && (
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
