"use client";

import { motion } from "motion/react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { DONE_COLLAPSE_AFTER_DAYS } from "@/lib/domain/filters";
import { springs } from "@/lib/motion";

/** Done column footer: older completed tasks stay out of the way until asked for. */
export function DoneOlderToggle({
  count,
  expanded,
  onToggle,
}: Readonly<{ count: number; expanded: boolean; onToggle: () => void }>) {
  const noun = count === 1 ? "task" : "tasks";
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-xs text-fg-secondary transition-colors hover:border-brand/50 hover:text-fg"
    >
      <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={springs.snappy}>
        <ChevronDownIcon className="size-4" />
      </motion.span>
      {expanded
        ? `Hide ${count} older ${noun}`
        : `${count} ${noun} done over ${DONE_COLLAPSE_AFTER_DAYS} days ago`}
    </button>
  );
}
