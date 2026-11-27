"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

/** Confetti for the moment of ticking a box: angle (radians) and colour per particle. */
const BURST = [
  "bg-success",
  "bg-accent",
  "bg-info",
  "bg-brand-text",
  "bg-success",
  "bg-warning",
  "bg-accent",
  "bg-info",
].map((color, index, all) => ({ color, angle: (index / all.length) * Math.PI * 2 }));

export function Checkbox({
  checked,
  onChange,
  label,
}: Readonly<{ checked: boolean; onChange: (checked: boolean) => void; label: string }>) {
  // Increments on each tick so the burst replays; 0 means "never ticked here".
  const [burst, setBurst] = useState(0);

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        if (!checked) setBurst((count) => count + 1);
        onChange(!checked);
      }}
      whileTap={{ scale: 0.8 }}
      transition={springs.press}
      className={cn(
        "relative grid size-5 shrink-0 place-items-center rounded-md border transition-[background-color,border-color,box-shadow] duration-200",
        checked
          ? "border-success bg-success shadow-glow-success"
          : "border-line-strong hover:border-brand hover:shadow-glow-brand",
      )}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 text-on-success" aria-hidden>
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
      {burst > 0 &&
        BURST.map(({ color, angle }, index) => (
          <motion.span
            key={`${burst}-${index}`}
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 -mt-0.5 -ml-0.5 size-1 rounded-full",
              color,
            )}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1.2 }}
            animate={{ x: Math.cos(angle) * 16, y: Math.sin(angle) * 16, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
    </motion.button>
  );
}
