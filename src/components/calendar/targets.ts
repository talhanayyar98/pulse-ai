import { format } from "date-fns";
import { type DayKey, dayKey, parseDayKey } from "@/lib/domain/calendar";
import type { Task } from "@/lib/domain/task";

/** Drop target ids shared by the week planner and month calendar. */
export const UNSCHEDULED_TARGET = "unscheduled";
const DAY_PREFIX = "day:";

export function dayTarget(key: DayKey): string {
  return `${DAY_PREFIX}${key}`;
}

/** The day a target stands for; null for the unscheduled tray (or anything else). */
export function dayOfTarget(target: string): Date | null {
  return target.startsWith(DAY_PREFIX) ? parseDayKey(target.slice(DAY_PREFIX.length)) : null;
}

export function targetOfTask(task: Task): string {
  return task.dueAt ? dayTarget(dayKey(new Date(task.dueAt))) : UNSCHEDULED_TARGET;
}

/** "Monday 7 December", or "Unscheduled". */
export function describeTarget(target: string): string {
  const day = dayOfTarget(target);
  return day ? format(day, "EEEE d MMMM") : "Unscheduled";
}
