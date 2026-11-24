export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
}

let items: readonly ToastItem[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToastSnapshot(): readonly ToastItem[] {
  return items;
}

export function pushToast(kind: ToastKind, message: string): void {
  const id = Date.now() + Math.random();
  items = [...items, { id, kind, message }];
  emit();
  window.setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    emit();
  }, 4000);
}
