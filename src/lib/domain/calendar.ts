import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { compareOrder } from "./ordering";
import { projectOccurrences } from "./series";
import type { WeekStartsOn } from "./settings";
import type { Horizon, Task } from "./task";
import { occurrenceId } from "./task-id";
import type { TaskStatus } from "./task-status";

/** A local calendar day, "yyyy-MM-dd". */
export type DayKey = string;

export function dayKey(date: Date): DayKey {
  return format(date, "yyyy-MM-dd");
}

/** Local midnight of the day, or null for anything that isn't a "yyyy-MM-dd" date. */
export function parseDayKey(key: DayKey): Date | null {
  const day = parse(key, "yyyy-MM-dd", new Date());
  return isValid(day) ? day : null;
}

/** The seven days of `anchor`'s week. */
export function weekDays(anchor: Date, weekStartsOn: WeekStartsOn): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Whole weeks covering `anchor`'s month (four to six rows of seven days). */
export function monthWeeks(anchor: Date, weekStartsOn: WeekStartsOn): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn }),
  });
  return Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7));
}

/** "7 – 13 Dec 2026", "30 Nov – 6 Dec 2026", "28 Dec 2026 – 3 Jan 2027". */
export function formatDayRange(start: Date, end: Date): string {
  if (!isSameYear(start, end))
    return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
  if (!isSameMonth(start, end)) return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  return `${format(start, "d")} – ${format(end, "d MMM yyyy")}`;
}

/** The due date a task gets when dropped on `day`: timed tasks keep their time of day. */
export function rescheduleTo(
  task: Pick<Task, "dueAt" | "allDay">,
  day: Date,
): Pick<Task, "dueAt" | "allDay"> {
  if (task.dueAt && !task.allDay) {
    const time = new Date(task.dueAt);
    const at = new Date(day);
    at.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    return { dueAt: at.toISOString(), allDay: false };
  }
  return { dueAt: startOfDay(day).toISOString(), allDay: true };
}

/** Something to show on a calendar day: a real task, or a projected occurrence of one. */
export interface CalendarEntry {
  /** Unique per entry: the task id, or the occurrence id a projection would get. */
  key: string;
  kind: "task" | "projected";
  /** The task itself; for a projection, the series' current occurrence. */
  task: Task;
  at: Date;
}

/** Tasks due on each of `days`, plus projected occurrences, each day in display order. */
export function entriesByDay(
  tasks: readonly Task[],
  days: readonly Date[],
  now: Date,
  weekStartsOn: WeekStartsOn,
): Map<DayKey, CalendarEntry[]> {
  const byDay = new Map<DayKey, CalendarEntry[]>(days.map((day) => [dayKey(day), []]));
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) return byDay;

  for (const task of tasks) {
    if (!task.dueAt || task.deletedAt) continue;
    const at = new Date(task.dueAt);
    byDay.get(dayKey(at))?.push({ key: task.id, kind: "task", task, at });
  }
  const range = { start: startOfDay(first), end: endOfDay(last) };
  for (const { task, at } of projectOccurrences(tasks, range, now, weekStartsOn)) {
    byDay.get(dayKey(at))?.push({ key: occurrenceId(task.id, at), kind: "projected", task, at });
  }
  for (const entries of byDay.values()) entries.sort(compareEntries);
  return byDay;
}

/** Open before done; all-day before timed; then by time and board order. */
function compareEntries(a: CalendarEntry, b: CalendarEntry): number {
  const done = (entry: CalendarEntry) => Number(entry.task.status === "done");
  const timed = (entry: CalendarEntry) => Number(!entry.task.allDay);
  return (
    done(a) - done(b) ||
    timed(a) - timed(b) ||
    a.at.getTime() - b.at.getTime() ||
    compareOrder(a.task, b.task)
  );
}

const HORIZON_RANK: Record<Horizon, number> = { week: 0, month: 1, none: 2 };
const STATUS_RANK: Record<TaskStatus, number> = { in_progress: 0, todo: 1, backlog: 2, done: 3 };

/** Open tasks without a due date: planned for this week first, then this month, then the rest. */
export function unscheduledTasks(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((task) => !task.dueAt && task.status !== "done" && !task.deletedAt)
    .sort(
      (a, b) =>
        HORIZON_RANK[a.horizon] - HORIZON_RANK[b.horizon] ||
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        compareOrder(a, b),
    );
}
