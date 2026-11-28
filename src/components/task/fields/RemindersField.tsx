"use client";

import { addHours, format, isValid, parse, startOfHour } from "date-fns";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { OffsetToggles } from "@/components/reminders/OffsetToggles";
import { Button } from "@/components/ui/Button";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { useReminderPolicy } from "@/lib/client/reminders";
import {
  type AbsoluteReminder,
  effectiveReminders,
  MAX_REMINDERS,
  type OffsetReminder,
  type ReminderRule,
  scheduledReminders,
  toggleOffset,
} from "@/lib/domain/reminders";
import type { Task, TaskPatch } from "@/lib/domain/task";
import { useNow } from "@/lib/hooks/use-now";
import { ALL_DAY_PRESETS, formatReminderTime, TIMED_PRESETS } from "@/lib/reminder-label";

const isOffset = (rule: ReminderRule): rule is OffsetReminder => rule.kind === "offset";
const isAbsolute = (rule: ReminderRule): rule is AbsoluteReminder => rule.kind === "absolute";

/**
 * Reminders before the deadline (toggles) and at set moments. A task without reminders of its
 * own shows the user's defaults; changing anything gives it its own list.
 */
export function RemindersField({
  task,
  onChange,
}: Readonly<{ task: Task; onChange: (patch: TaskPatch) => void }>) {
  const policy = useReminderPolicy();
  const now = useNow();
  const rules = effectiveReminders(task, policy);
  const setRules = (reminders: ReminderRule[]) => onChange({ reminders });
  const upcoming = scheduledReminders(task, policy)
    .filter(({ fireAt }) => fireAt > now)
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());

  return (
    <div className="flex flex-col items-start gap-3">
      {task.dueAt ? (
        <OffsetToggles
          label="Remind me before it's due"
          presets={task.allDay ? ALL_DAY_PRESETS : TIMED_PRESETS}
          rules={rules.filter(isOffset)}
          allDay={task.allDay}
          ruleCount={rules.length}
          onToggle={(offset) => setRules(toggleOffset(rules, offset, crypto.randomUUID()))}
        />
      ) : (
        <p className="pt-1 text-xs text-fg-secondary">
          Give it a due date to be reminded before it&apos;s due.
        </p>
      )}

      <SetTimeReminders
        rules={rules.filter(isAbsolute)}
        canAdd={rules.length < MAX_REMINDERS}
        onAdd={(at) =>
          setRules([...rules, { id: crypto.randomUUID(), kind: "absolute", at: at.toISOString() }])
        }
        onRemove={(id) => setRules(rules.filter((rule) => rule.id !== id))}
      />

      <p className="text-xs text-fg-secondary">
        <Summary task={task} upcoming={upcoming.map(({ fireAt }) => fireAt)} />
        {task.reminders === null ? (
          <span className="text-fg-muted"> · Your default reminders</span>
        ) : (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => onChange({ reminders: null })}
              className="font-medium text-info underline-offset-2 hover:underline"
            >
              Use my defaults
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function Summary({ task, upcoming }: Readonly<{ task: Task; upcoming: Date[] }>) {
  if (task.status === "done") return <>Finished tasks don&apos;t remind you</>;
  const [next, ...rest] = upcoming;
  if (!next) return <>No reminders to come</>;
  return (
    <>
      Next reminder:{" "}
      <span className="font-medium text-fg tabular-nums">{formatReminderTime(next)}</span>
      {rest.length > 0 && ` and ${rest.length} more`}
    </>
  );
}

/** `<input type="datetime-local">` speaks "yyyy-MM-ddTHH:mm" in local time. */
const LOCAL_INPUT = "yyyy-MM-dd'T'HH:mm";

function SetTimeReminders({
  rules,
  canAdd,
  onAdd,
  onRemove,
}: Readonly<{
  rules: readonly AbsoluteReminder[];
  canAdd: boolean;
  onAdd: (at: Date) => void;
  onRemove: (id: string) => void;
}>) {
  const [draft, setDraft] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const now = useNow();
  /** Closes the form and puts focus back where it opened, so Escape still reaches the drawer. */
  function closeForm() {
    flushSync(() => setDraft(null));
    addButton.current?.focus();
  }
  // Every field is in the input's format, so the reference date fills in nothing.
  const at = draft ? parse(draft, LOCAL_INPUT, new Date(0)) : null;
  const inFuture = (date: Date | null): date is Date =>
    date !== null && isValid(date) && date > now;

  return (
    <div className="flex w-full flex-col items-start gap-2">
      {rules.length > 0 && (
        <ul aria-label="Reminders at a set time" className="flex flex-wrap gap-1.5">
          {rules.map((rule) => {
            const label = formatReminderTime(new Date(rule.at));
            return (
              <li
                key={rule.id}
                className="flex h-8 items-center gap-1 rounded-full bg-brand/10 pr-1 pl-3 text-xs font-semibold text-brand-text tabular-nums ring-1 ring-brand/25"
              >
                {label}
                <button
                  type="button"
                  aria-label={`Remove the reminder at ${label}`}
                  onClick={() => onRemove(rule.id)}
                  className="grid size-6 place-items-center rounded-full transition-colors hover:bg-brand/15"
                >
                  <XIcon className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {draft === null ? (
        <button
          ref={addButton}
          type="button"
          disabled={!canAdd}
          title={canAdd ? undefined : `At most ${MAX_REMINDERS} reminders`}
          onClick={() => setDraft(format(addHours(startOfHour(new Date()), 1), LOCAL_INPUT))}
          className="flex items-center gap-1 rounded-lg py-1 text-xs font-medium text-info transition-colors hover:text-fg disabled:text-fg-muted"
        >
          <PlusIcon className="size-3.5" />
          At a set time
        </button>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            // A moment that has passed would never fire.
            if (!inFuture(at)) return;
            onAdd(at);
            closeForm();
          }}
        >
          <input
            type="datetime-local"
            aria-label="Remind me at"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="field tabular-nums"
          />
          <Button type="submit" size="sm" variant="primary" disabled={!inFuture(at)}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={closeForm}>
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}
