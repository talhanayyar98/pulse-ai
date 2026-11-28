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
  disabled?: boolean;
}

/** A radio group drawn as a segmented control. Arrow keys move the selection. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SegmentedProps<T>) {
  const thumbId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined || disabled) return;
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
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex flex-wrap rounded-xl border border-line bg-sunken p-0.5",
        disabled && "opacity-60",
      )}
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
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-[10px] px-2.5 py-1 text-xs font-medium transition-colors duration-200 enabled:active:scale-95",
              active ? "text-fg" : "text-fg-secondary enabled:hover:bg-fg/4 enabled:hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={thumbId}
                transition={springs.snappy}
                className="absolute inset-0 rounded-[10px] bg-surface shadow-card ring-1 ring-fg/5"
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
