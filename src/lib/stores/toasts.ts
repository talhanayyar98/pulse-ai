import { create } from "zustand";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  /** "success" uses the neon accent; everything else stays neutral. */
  tone: "default" | "success";
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }) => void;
  dismiss: (id: string) => void;
}

const VISIBLE_MS = 4_500;
const MAX_TOASTS = 3;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    const next: Toast = { ...toast, id, tone: toast.tone ?? "default" };
    set((state) => ({ toasts: [...state.toasts, next].slice(-MAX_TOASTS) }));
    setTimeout(() => get().dismiss(id), VISIBLE_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
