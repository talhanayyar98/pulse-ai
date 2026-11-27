"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

export function Checkbox({
  checked,
  onChange,
  label,
}: Readonly<{ checked: boolean; onChange: (checked: boolean) => void; label: string }>) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.82 }}
      transition={springs.press}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-md border transition-[background-color,border-color,box-shadow]",
        checked
          ? "border-neon bg-neon shadow-glow-neon"
          : "border-line-strong hover:border-brand hover:shadow-glow-brand",
      )}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 text-on-neon" aria-hidden>
        <motion.path
          d="M3.5 8.5l3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      </svg>
    </motion.button>
  );
}
