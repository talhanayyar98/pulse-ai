"use client";

import { motion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
}

/** A radio group drawn as a segmented control. Arrow keys move the selection. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  const thumbId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const nextIndex = (index + step + options.length) % options.length;
    const next = options[nextIndex];
    if (!next) return;
    onChange(next.value);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[nextIndex]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex flex-wrap rounded-xl border border-line bg-canvas/50 p-0.5 shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)]"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-[10px] px-2.5 py-1 text-xs font-medium transition-colors duration-200 active:scale-95",
              active ? "text-fg" : "text-fg-secondary hover:bg-white/4 hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={thumbId}
                transition={springs.snappy}
                className="absolute inset-0 rounded-[10px] bg-linear-to-r from-brand/40 to-accent/25 shadow-glow-brand"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
