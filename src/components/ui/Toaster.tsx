"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";
import { TOAST_VISIBLE_MS, type Toast, useToasts } from "@/lib/stores/toasts";
import { CheckIcon, InfoIcon, XIcon } from "./icons";

const TONE: Record<Toast["tone"], { icon: string; border: string; timer: string }> = {
  success: {
    icon: "bg-success/12 text-success",
    border: "border-success/30",
    timer: "bg-success",
  },
  default: {
    icon: "bg-info/12 text-info",
    border: "border-line",
    timer: "bg-info",
  },
};

export function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);

  return (
    <section
      aria-label="Status messages"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-60 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE[toast.tone];
          const Icon = toast.tone === "success" ? CheckIcon : InfoIcon;
          return (
            <motion.div
              key={toast.id}
              layout
              role="status"
              initial={{ opacity: 0, y: 24, scale: 0.9, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.2 } }}
              transition={springs.snappy}
              className={cn(
                "pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border bg-surface p-3.5 shadow-lift",
                tone.border,
              )}
            >
              <span
                aria-hidden
                className={cn("grid size-6 shrink-0 place-items-center rounded-full", tone.icon)}
              >
                <Icon className="size-3.5" strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-fg-secondary">{toast.description}</p>
                )}
              </div>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="-my-0.5 shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-info transition-colors hover:bg-info/8"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-0.5 text-fg-muted transition hover:rotate-90 hover:text-fg"
              >
                <XIcon className="size-4" />
              </button>
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 bottom-0 h-0.5 origin-left animate-toast-timer",
                  tone.timer,
                )}
                style={{ animationDuration: `${TOAST_VISIBLE_MS}ms` }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </section>
  );
}
