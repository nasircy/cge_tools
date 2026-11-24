import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getToastSnapshot, subscribeToasts, type ToastItem } from "./toast-store";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

const tones = {
  success: "text-success",
  error: "text-danger",
  info: "text-sky-600",
} as const;

function Toast({ item }: { readonly item: ToastItem }) {
  const Icon = icons[item.kind];
  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-panel border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 shadow-lg">
      <Icon className={`mt-0.5 size-5 shrink-0 ${tones[item.kind]}`} aria-hidden="true" />
      <p className="flex-1 text-sm leading-relaxed">{item.message}</p>
    </div>
  );
}

export default function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastSnapshot);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {items.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  );
}
