"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { LIMITS, normalizeLabels } from "@/lib/domain/task";
import { labelTone } from "@/lib/label-tone";
import { springs } from "@/lib/motion";

export function LabelsField({
  labels,
  suggestions,
  onChange,
}: Readonly<{ labels: string[]; suggestions: string[]; onChange: (labels: string[]) => void }>) {
  const [input, setInput] = useState("");
  const listId = useId();

  function add() {
    const next = normalizeLabels([...labels, input]);
    if (next.length !== labels.length) onChange(next);
    setInput("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AnimatePresence initial={false}>
        {labels.map((label) => (
          <motion.span
            key={label}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={springs.snappy}
            className={cn(
              "inline-flex items-center gap-1 rounded-md py-0.5 pr-0.5 pl-2 text-xs",
              labelTone(label).chip,
            )}
          >
            {label}
            <button
              type="button"
              aria-label={`Remove label ${label}`}
              onClick={() => onChange(labels.filter((existing) => existing !== label))}
              className="rounded p-0.5 transition hover:rotate-90 hover:bg-white/10 hover:text-fg"
            >
              <XIcon className="size-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      {labels.length < LIMITS.labels && (
        <>
          <input
            aria-label="Add label"
            placeholder="Add label…"
            value={input}
            list={listId}
            maxLength={LIMITS.label}
            onChange={(event) => setInput(event.target.value)}
            onBlur={() => input.trim() && add()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                add();
              } else if (event.key === "Backspace" && !input && labels.length > 0) {
                onChange(labels.slice(0, -1));
              }
            }}
            className="min-w-24 flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm placeholder:text-fg-muted"
          />
          <datalist id={listId}>
            {suggestions
              .filter((suggestion) => !labels.includes(suggestion))
              .map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
          </datalist>
        </>
      )}
    </div>
  );
}
