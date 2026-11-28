"use client";

import { startOfDay } from "date-fns";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { useWeekStartsOn } from "@/lib/client/settings";
import {
  MAX_INTERVAL,
  type MonthlyRecurrence,
  type Recurrence,
  type RecurrenceFreq,
  recurrenceFor,
  type WeeklyRecurrence,
} from "@/lib/domain/recurrence";
import { upcomingOccurrences } from "@/lib/domain/series";
import type { Task, TaskPatch } from "@/lib/domain/task";
import { useNow } from "@/lib/hooks/use-now";
import { formatOccurrence, intervalUnit, WEEKDAY_NAME, weekdaysFrom } from "@/lib/recurrence-label";

type RepeatChoice = "none" | RecurrenceFreq;

const REPEAT_OPTIONS: ReadonlyArray<{ value: RepeatChoice; label: string }> = [
  { value: "none", label: "Never" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const INTERVALS = Array.from({ length: MAX_INTERVAL }, (_, index) => index + 1);
const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

/** Adds or removes `value`, keeping the list sorted. */
function toggled(values: readonly number[], value: number): number[] {
  return values.includes(value)
    ? values.filter((existing) => existing !== value)
    : [...values, value].sort((a, b) => a - b);
}

/** Never / weekly on chosen weekdays / monthly on chosen days, every 1–12 weeks or months. */
export function RepeatField({
  task,
  onChange,
}: Readonly<{ task: Task; onChange: (patch: TaskPatch) => void }>) {
  const weekStartsOn = useWeekStartsOn();
  const now = useNow();
  const rule = task.recurrence;

  function choose(choice: RepeatChoice) {
    if (choice === "none") {
      onChange({ recurrence: null });
      return;
    }
    if (rule?.freq === choice) return;
    // A series is anchored on its due date, so repeating an undated task starts it today.
    const anchor = task.dueAt ? new Date(task.dueAt) : startOfDay(now);
    onChange({
      recurrence: recurrenceFor(choice, anchor),
      ...(task.dueAt ? {} : { dueAt: anchor.toISOString(), allDay: true }),
    });
  }

  const setRule = (recurrence: Recurrence) => onChange({ recurrence });
  const next = rule ? upcomingOccurrences(task, now, weekStartsOn).next() : null;

  return (
    <div className="flex flex-col items-start gap-3">
      <Segmented
        label="Repeat"
        value={rule?.freq ?? "none"}
        options={REPEAT_OPTIONS}
        onChange={choose}
      />
      {rule && (
        <div className="flex w-full animate-fade-up flex-col gap-3 rounded-xl border border-line bg-sunken/50 p-3">
          <div className="flex items-center gap-2 text-sm text-fg-secondary">
            <span>Every</span>
            <select
              aria-label="Repeat every"
              value={rule.interval}
              onChange={(event) => setRule({ ...rule, interval: Number(event.target.value) })}
              className="field py-1 pr-7"
            >
              {INTERVALS.map((interval) => (
                <option key={interval} value={interval}>
                  {intervalUnit({ freq: rule.freq, interval })}
                </option>
              ))}
            </select>
            <span>on</span>
          </div>
          {rule.freq === "weekly" ? (
            <WeekdayPicker rule={rule} weekStartsOn={weekStartsOn} onChange={setRule} />
          ) : (
            <MonthDayPicker rule={rule} onChange={setRule} />
          )}
          {next && !next.done && (
            <p className="text-xs text-fg-secondary">
              Next one:{" "}
              <span className="font-medium text-fg tabular-nums">
                {formatOccurrence(next.value, task.allDay)}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const DAY_TOGGLE =
  "grid size-8 place-items-center rounded-full text-xs font-semibold tabular-nums transition-[background-color,color,box-shadow,scale] duration-200 active:scale-90";
const DAY_ON = "bg-brand text-on-brand shadow-cta";
const DAY_OFF =
  "bg-surface text-fg-secondary ring-1 ring-line-strong hover:text-fg hover:ring-fg/30";
/** A repeat needs at least one day, so the last chosen day can't be turned off. */
const LAST_DAY_HINT = "A repeat needs at least one day";

function WeekdayPicker({
  rule,
  weekStartsOn,
  onChange,
}: Readonly<{
  rule: WeeklyRecurrence;
  weekStartsOn: ReturnType<typeof useWeekStartsOn>;
  onChange: (rule: WeeklyRecurrence) => void;
}>) {
  return (
    <div role="group" aria-label="Repeat on" className="flex flex-wrap gap-1.5">
      {weekdaysFrom(weekStartsOn).map((day) => {
        const on = rule.byWeekday.includes(day);
        const last = on && rule.byWeekday.length === 1;
        const name = WEEKDAY_NAME[day] ?? "";
        return (
          <button
            key={day}
            type="button"
            aria-label={name}
            aria-pressed={on}
            aria-disabled={last || undefined}
            title={last ? LAST_DAY_HINT : name}
            onClick={() => {
              if (!last) onChange({ ...rule, byWeekday: toggled(rule.byWeekday, day) });
            }}
            className={cn(DAY_TOGGLE, on ? DAY_ON : DAY_OFF)}
          >
            {name.slice(0, 2)}
          </button>
        );
      })}
    </div>
  );
}

function MonthDayPicker({
  rule,
  onChange,
}: Readonly<{ rule: MonthlyRecurrence; onChange: (rule: MonthlyRecurrence) => void }>) {
  const clamps = rule.byMonthDay.some((day) => day > 28);
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Repeat on day" className="grid w-fit grid-cols-7 gap-1">
        {MONTH_DAYS.map((day) => {
          const on = rule.byMonthDay.includes(day);
          const last = on && rule.byMonthDay.length === 1;
          return (
            <button
              key={day}
              type="button"
              aria-label={`Day ${day}`}
              aria-pressed={on}
              aria-disabled={last || undefined}
              title={last ? LAST_DAY_HINT : undefined}
              onClick={() => {
                if (!last) onChange({ ...rule, byMonthDay: toggled(rule.byMonthDay, day) });
              }}
              className={cn(DAY_TOGGLE, on ? DAY_ON : DAY_OFF)}
            >
              {day}
            </button>
          );
        })}
      </div>
      {clamps && (
        <p className="text-xs text-fg-muted">
          In shorter months, days past the end fall on the month&apos;s last day.
        </p>
      )}
    </div>
  );
}
