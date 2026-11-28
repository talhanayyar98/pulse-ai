"use client";

import { AnimatePresence, motion } from "motion/react";
import { useAppBadge, useOverdueCount } from "@/lib/client/overdue";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

/**
 * Rose overdue count. "pill" reads "3 overdue" (board header) with a pinging dot; "count" is a
 * compact number for navigation items, with the full wording for screen readers.
 */
export function OverdueBadge({
  variant,
  className,
}: Readonly<{ variant: "pill" | "count"; className?: string }>) {
  const count = useOverdueCount();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={springs.snappy}
          className={cn(
            "inline-flex items-center justify-center rounded-full font-mono font-semibold",
            variant === "pill"
              ? "h-6 gap-1.5 border border-danger/45 bg-danger/12 px-2.5 text-xs text-danger shadow-glow-danger"
              : "h-4.5 min-w-4.5 bg-danger-strong px-1 text-[10px] text-on-brand shadow-[0_0_12px_-2px_var(--color-danger-glow)]",
            className,
          )}
        >
          {variant === "pill" ? (
            <>
              <span aria-hidden className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-danger" />
                <span className="relative size-1.5 rounded-full bg-danger" />
              </span>
              {`${count} overdue`}
            </>
          ) : (
            <>
              <span aria-hidden>{count}</span>
              <span className="sr-only">({count} overdue)</span>
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Keeps the installed app's icon badge in sync with the overdue count. Renders nothing. */
export function AppBadgeSync() {
  useAppBadge(useOverdueCount());
  return null;
}
