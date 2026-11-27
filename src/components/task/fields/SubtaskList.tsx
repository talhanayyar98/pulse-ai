"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { LIMITS, type Subtask } from "@/lib/domain/task";
import { springs } from "@/lib/motion";

export function SubtaskList({
  subtasks,
  onChange,
}: Readonly<{ subtasks: Subtask[]; onChange: (subtasks: Subtask[]) => void }>) {
  const [draft, setDraft] = useState("");
  const done = subtasks.filter((subtask) => subtask.done).length;
  const complete = subtasks.length > 0 && done === subtasks.length;

  function add() {
    const title = draft.trim();
    if (!title) return;
    onChange([...subtasks, { id: crypto.randomUUID(), title, done: false }]);
    setDraft("");
  }

  return (
    <div>
      {subtasks.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className={cn("h-full rounded-full", complete ? "bg-neon" : "bg-brand")}
              initial={false}
              animate={{ width: `${(done / subtasks.length) * 100}%` }}
              transition={springs.snappy}
            />
          </div>
          <span className="font-mono text-xs text-fg-secondary">
            {done}/{subtasks.length}
          </span>
        </div>
      )}

      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
          {subtasks.map((subtask) => (
            <motion.li
              key={subtask.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={springs.snappy}
              className="group flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-white/3"
            >
              <Checkbox
                checked={subtask.done}
                label={subtask.title}
                onChange={(checked) =>
                  onChange(
                    subtasks.map((item) =>
                      item.id === subtask.id ? { ...item, done: checked } : item,
                    ),
                  )
                }
              />
              <span
                className={cn(
                  "flex-1 text-sm transition-colors",
                  subtask.done && "text-fg-muted line-through",
                )}
              >
                {subtask.title}
              </span>
              <button
                type="button"
                aria-label={`Delete subtask ${subtask.title}`}
                onClick={() => onChange(subtasks.filter((item) => item.id !== subtask.id))}
                className="rounded p-1 text-fg-muted opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
              >
                <XIcon className="size-3.5" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {subtasks.length < LIMITS.subtasks && (
        <div className="mt-1 flex items-center gap-3 px-1 py-1.5">
          <PlusIcon className="size-5 text-fg-muted" />
          <input
            aria-label="Add subtask"
            placeholder="Add a subtask…"
            value={draft}
            maxLength={LIMITS.title}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            onBlur={add}
            className="flex-1 bg-transparent text-sm placeholder:text-fg-muted"
          />
        </div>
      )}
    </div>
  );
}
