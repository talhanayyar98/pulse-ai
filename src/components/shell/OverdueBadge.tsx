"use client";

import { AnimatePresence, motion } from "motion/react";
import { useAppBadge, useOverdueCount } from "@/lib/client/overdue";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

/**
 * Neon overdue count. "pill" reads "3 overdue" (board header); "count" is a compact number
 * for navigation items, with the full wording for screen readers.
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
            "inline-flex items-center justify-center rounded-full bg-neon font-mono font-semibold text-on-neon shadow-glow-neon",
            variant === "pill" ? "h-6 gap-1 px-2.5 text-xs" : "h-4.5 min-w-4.5 px-1 text-[10px]",
            className,
          )}
        >
          {variant === "pill" ? (
            `${count} overdue`
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
