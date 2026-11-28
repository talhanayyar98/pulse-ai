import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  getDate,
  getDaysInMonth,
  setDate,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { z } from "zod";
import type { WeekStartsOn } from "./settings";

export const RECURRENCE_FREQS = ["weekly", "monthly"] as const;
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];

/** "Every 1 to 12 weeks (or months)". */
export const MAX_INTERVAL = 12;

const interval = z.int().min(1).max(MAX_INTERVAL);
const distinct = (values: readonly number[]) => new Set(values).size === values.length;

export const recurrenceSchema = z.discriminatedUnion("freq", [
  z.object({
    freq: z.literal("weekly"),
    interval,
    /** Days of the week, numbered as date-fns does (0 = Sunday). */
    byWeekday: z.array(z.int().min(0).max(6)).min(1).max(7).refine(distinct, "Repeated weekday"),
  }),
  z.object({
    freq: z.literal("monthly"),
    interval,
    /** Days of the month. A day past the end of a short month falls on its last day. */
    byMonthDay: z.array(z.int().min(1).max(31)).min(1).max(31).refine(distinct, "Repeated day"),
  }),
]);
export type Recurrence = z.infer<typeof recurrenceSchema>;
export type WeeklyRecurrence = Extract<Recurrence, { freq: "weekly" }>;
export type MonthlyRecurrence = Extract<Recurrence, { freq: "monthly" }>;

/**
 * The rule's first date after `from`'s day, at `from`'s time of day.
 *
 * Everything is calculated in local time, so "Mondays 09:00" stays at 09:00 across
 * daylight-saving changes. `from` is the current occurrence; it may sit off the rule
 * (a task dragged to another day), and the series continues from wherever it is.
 */
export function nextOccurrence(rule: Recurrence, from: Date, weekStartsOn: WeekStartsOn): Date {
  const day =
    rule.freq === "weekly" ? nextWeeklyDay(rule, from, weekStartsOn) : nextMonthlyDay(rule, from);
  day.setHours(from.getHours(), from.getMinutes(), from.getSeconds(), from.getMilliseconds());
  return day;
}

/** The rest of `from`'s week first, then the first matching day `interval` weeks on. */
function nextWeeklyDay(rule: WeeklyRecurrence, from: Date, weekStartsOn: WeekStartsOn): Date {
  const week = startOfWeek(from, { weekStartsOn });
  const offsets = rule.byWeekday
    .map((weekday) => (weekday - weekStartsOn + 7) % 7)
    .sort((a, b) => a - b);
  const today = differenceInCalendarDays(from, week);
  const later = offsets.find((offset) => offset > today);
  if (later !== undefined) return addDays(week, later);
  return addDays(addWeeks(week, rule.interval), offsets[0] ?? 0);
}

/** The rest of `from`'s month first, then the first matching day `interval` months on. */
function nextMonthlyDay(rule: MonthlyRecurrence, from: Date): Date {
  const month = startOfMonth(from);
  const later = daysOfMonth(month, rule.byMonthDay).find((day) => day > getDate(from));
  if (later !== undefined) return setDate(month, later);
  const next = addMonths(month, rule.interval);
  return setDate(next, daysOfMonth(next, rule.byMonthDay)[0] ?? 1);
}

/** The rule's days within `month`, clamped to its length, in order. */
function daysOfMonth(month: Date, byMonthDay: readonly number[]): number[] {
  const last = getDaysInMonth(month);
  return [...new Set(byMonthDay.map((day) => Math.min(day, last)))].sort((a, b) => a - b);
}
