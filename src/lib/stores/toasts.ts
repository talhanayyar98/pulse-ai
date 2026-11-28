import { create } from "zustand";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  /** "success" uses the success colour; everything else stays on brand. */
  tone: "default" | "success";
  /** A button on the toast, e.g. "Open" on a reminder; clicking it also dismisses the toast. */
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }) => void;
  dismiss: (id: string) => void;
}

/** How long a toast stays up (its countdown bar runs for the same time). */
export const TOAST_VISIBLE_MS = 4_500;
const MAX_TOASTS = 3;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    const next: Toast = { ...toast, id, tone: toast.tone ?? "default" };
    set((state) => ({ toasts: [...state.toasts, next].slice(-MAX_TOASTS) }));
    setTimeout(() => get().dismiss(id), TOAST_VISIBLE_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
