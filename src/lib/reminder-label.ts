import { format } from "date-fns";
import type { OffsetReminder, ReminderUnit } from "@/lib/domain/reminders";

export type OffsetPreset = Pick<OffsetReminder, "amount" | "unit">;

/** The offsets offered as toggles, for timed tasks (and the defaults). */
export const TIMED_PRESETS: readonly OffsetPreset[] = [
  { amount: 0, unit: "minutes" },
  { amount: 5, unit: "minutes" },
  { amount: 15, unit: "minutes" },
  { amount: 30, unit: "minutes" },
  { amount: 1, unit: "hours" },
  { amount: 2, unit: "hours" },
  { amount: 1, unit: "days" },
  { amount: 2, unit: "days" },
  { amount: 1, unit: "weeks" },
];

/** All-day tasks count back from the all-day reminder time, so only whole days make sense. */
export const ALL_DAY_PRESETS: readonly OffsetPreset[] = [
  { amount: 0, unit: "minutes" },
  { amount: 1, unit: "days" },
  { amount: 2, unit: "days" },
  { amount: 1, unit: "weeks" },
];

export const sameOffset = (a: OffsetPreset, b: OffsetPreset) =>
  a.amount === b.amount && a.unit === b.unit;

const UNIT_MINUTES: Record<ReminderUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 24 * 60,
  weeks: 7 * 24 * 60,
};

/** Nearest the deadline first. */
export function byLeadTime(a: OffsetPreset, b: OffsetPreset): number {
  return a.amount * UNIT_MINUTES[a.unit] - b.amount * UNIT_MINUTES[b.unit];
}

const SINGULAR: Record<ReminderUnit, string> = {
  minutes: "minute",
  hours: "hour",
  days: "day",
  weeks: "week",
};
const SHORT: Record<ReminderUnit, string> = {
  minutes: "min",
  hours: "hr",
  days: "day",
  weeks: "wk",
};

/** "1 hour before", "15 minutes before", "At the deadline" / "On the day". */
export function describeOffset({ amount, unit }: OffsetPreset, allDay: boolean): string {
  if (amount === 0) return allDay ? "On the day" : "At the deadline";
  return `${amount} ${amount === 1 ? SINGULAR[unit] : unit} before`;
}

/** Compact toggle text: "Due time", "15 min", "1 hr", "2 days", "1 wk". */
export function shortOffset({ amount, unit }: OffsetPreset, allDay: boolean): string {
  if (amount === 0) return allDay ? "On the day" : "Due time";
  if (unit === "days") return amount === 1 ? "1 day" : `${amount} days`;
  return `${amount} ${SHORT[unit]}`;
}

/** "Mon 7 Dec, 08:15": a reminder's moment in full. */
export function formatReminderTime(at: Date): string {
  return format(at, "EEE d MMM, HH:mm");
}
