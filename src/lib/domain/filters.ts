import { tz } from "@date-fns/tz";
import { endOfDay, endOfMonth, endOfWeek, startOfMonth, startOfWeek, subDays } from "date-fns";
import type { WeekStartsOn } from "./settings";
import type { Priority, Task } from "./task";

export const HORIZON_FILTERS = ["all", "week", "month"] as const;
export type HorizonFilter = (typeof HORIZON_FILTERS)[number];

export interface BoardFilters {
  horizon: HorizonFilter;
  /** Empty means every priority. */
  priorities: Priority[];
  /** Empty means every label; otherwise a task needs at least one of them. */
  labels: string[];
}

export const NO_FILTERS: BoardFilters = { horizon: "all", priorities: [], labels: [] };

export const DUE_SOON_MS = 24 * 60 * 60 * 1000;

/**
 * When the task is actually due: the end of the day for all-day tasks, on this device's clock
 * or in `timeZone` (the server's view of the user's day).
 */
export function deadline(task: Pick<Task, "dueAt" | "allDay">, timeZone?: string): Date | null {
  if (!task.dueAt) return null;
  const due = new Date(task.dueAt);
  if (!task.allDay) return due;
  return new Date(endOfDay(due, timeZone ? { in: tz(timeZone) } : undefined).getTime());
}

export function isOverdue(task: Task, now: Date): boolean {
  const due = deadline(task);
  return due !== null && task.status !== "done" && due < now;
}

/** Due within the next 24 hours and not yet overdue. */
export function isDueSoon(task: Task, now: Date): boolean {
  const due = deadline(task);
  if (due === null || task.status === "done" || due < now) return false;
  return due.getTime() - now.getTime() <= DUE_SOON_MS;
}

function dueBetween(task: Task, start: Date, end: Date): boolean {
  if (!task.dueAt) return false;
  const due = new Date(task.dueAt);
  return due >= start && due <= end;
}

/**
 * "This week": planned for this week, or due this week.
 * "This month": everything in "this week", plus anything planned for or due this month.
 * Overdue tasks always match: they are the most "now" of all.
 */
export function matchesHorizon(
  task: Task,
  horizon: HorizonFilter,
  now: Date,
  weekStartsOn: WeekStartsOn,
): boolean {
  if (horizon === "all" || isOverdue(task, now)) return true;
  const options = { weekStartsOn };
  const thisWeek =
    task.horizon === "week" || dueBetween(task, startOfWeek(now, options), endOfWeek(now, options));
  if (horizon === "week") return thisWeek;
  return (
    thisWeek || task.horizon === "month" || dueBetween(task, startOfMonth(now), endOfMonth(now))
  );
}

export function matchesFilters(
  task: Task,
  filters: BoardFilters,
  now: Date,
  weekStartsOn: WeekStartsOn,
): boolean {
  if (!matchesHorizon(task, filters.horizon, now, weekStartsOn)) return false;
  if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
  if (filters.labels.length > 0) {
    const own = new Set(task.labels.map((label) => label.toLowerCase()));
    if (!filters.labels.some((label) => own.has(label.toLowerCase()))) return false;
  }
  return true;
}

export function hasActiveFilters(filters: BoardFilters): boolean {
  return filters.horizon !== "all" || filters.priorities.length > 0 || filters.labels.length > 0;
}

export const DONE_COLLAPSE_AFTER_DAYS = 7;

/** Splits Done tasks into those completed in the last week and older ones (collapsed on the board). */
export function splitDoneTasks(
  tasks: readonly Task[],
  now: Date,
): { recent: Task[]; older: Task[] } {
  const cutoff = subDays(now, DONE_COLLAPSE_AFTER_DAYS).getTime();
  const recent: Task[] = [];
  const older: Task[] = [];
  for (const task of tasks) {
    const completed = task.completedAt ? Date.parse(task.completedAt) : null;
    (completed !== null && completed < cutoff ? older : recent).push(task);
  }
  return { recent, older };
}
