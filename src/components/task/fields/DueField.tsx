"use client";

import { XIcon } from "@/components/ui/icons";
import type { Task } from "@/lib/domain/task";
import { dueToInputs, inputsToDue } from "@/lib/due-date";
import { useDraft } from "@/lib/hooks/use-draft";

type Due = Pick<Task, "dueAt" | "allDay">;
type Inputs = { date: string; time: string };

const sameInputs = (a: Inputs, b: Inputs) => a.date === b.date && a.time === b.time;

/**
 * Native date and time pickers (great on macOS and mobile). Saved when focus leaves the
 * date+time pair, not on every change: native date inputs emit partial values while a year
 * is typed, and saving the date alone would echo back and reset a time still being entered.
 */
export function DueField({ due, onCommit }: Readonly<{ due: Due; onCommit: (due: Due) => void }>) {
  const { draft, setDraft, flush } = useDraft(
    dueToInputs(due),
    (next) => onCommit(inputsToDue(next.date, next.time)),
    sameInputs,
  );

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) flush();
      }}
    >
      <input
        type="date"
        aria-label="Due date"
        value={draft.date}
        onChange={(event) => setDraft({ ...draft, date: event.target.value })}
        className="field font-mono"
      />
      <input
        type="time"
        aria-label="Due time"
        value={draft.time}
        disabled={!draft.date}
        onChange={(event) => setDraft({ ...draft, time: event.target.value })}
        className="field font-mono"
      />
      {draft.date && (
        <button
          type="button"
          aria-label="Clear due date"
          onClick={() => {
            setDraft({ date: "", time: "" });
            onCommit({ dueAt: null, allDay: false });
          }}
          className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
