import { tz } from "@date-fns/tz";
import { differenceInCalendarDays, format, isSameYear, isValid, parse, startOfDay } from "date-fns";
import type { Task } from "@/lib/domain/task";

type Due = Pick<Task, "dueAt" | "allDay">;

/** Values for native `<input type="date">` and `<input type="time">`, in local time. */
export function dueToInputs({ dueAt, allDay }: Due): { date: string; time: string } {
  if (!dueAt) return { date: "", time: "" };
  const due = new Date(dueAt);
  return { date: format(due, "yyyy-MM-dd"), time: allDay ? "" : format(due, "HH:mm") };
}

/** A date without a time makes the task due all day (stored as local midnight). */
export function inputsToDue(date: string, time: string): Due {
  const day = parse(date, "yyyy-MM-dd", new Date());
  if (!date || !isValid(day)) return { dueAt: null, allDay: false };
  if (!time) return { dueAt: startOfDay(day).toISOString(), allDay: true };
  const at = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return isValid(at) ? { dueAt: at.toISOString(), allDay: false } : { dueAt: null, allDay: false };
}

/**
 * Short, human label for a due date: "Today 14:30", "Tomorrow", "Fri", "3 Dec", "3 Dec 2027".
 * In this device's time zone, or in `timeZone` (the server words reminders in the user's).
 */
export function formatDue({ dueAt, allDay }: Due, now: Date, timeZone?: string): string | null {
  if (!dueAt) return null;
  const options = timeZone ? { in: tz(timeZone) } : {};
  const due = new Date(dueAt);
  const time = allDay ? "" : ` ${format(due, "HH:mm", options)}`;
  const days = differenceInCalendarDays(due, now, options);

  if (days === 0) return `Today${time}`;
  if (days === 1) return `Tomorrow${time}`;
  if (days === -1) return `Yesterday${time}`;
  if (days > 1 && days < 7) return `${format(due, "EEE", options)}${time}`;
  const dateFormat = isSameYear(due, now, options) ? "d MMM" : "d MMM yyyy";
  return `${format(due, dateFormat, options)}${time}`;
}
