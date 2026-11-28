import { format } from "date-fns";
import type { Recurrence } from "@/lib/domain/recurrence";
import type { WeekStartsOn } from "@/lib/domain/settings";

/** Indexed by date-fns weekday number (0 = Sunday). */
export const WEEKDAY_NAME = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** The seven weekday numbers, starting from the user's first day of the week. */
export function weekdaysFrom(weekStartsOn: WeekStartsOn): number[] {
  return Array.from({ length: 7 }, (_, index) => (weekStartsOn + index) % 7);
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 22nd, 23rd … 31st. */
export function ordinal(day: number): string {
  const teen = day % 100 >= 11 && day % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][day % 10] ?? "th");
  return `${day}${suffix}`;
}

function joinWithAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1) ?? ""}`;
}

/** "week", "2 weeks", "month", "3 months". */
export function intervalUnit(rule: Pick<Recurrence, "freq" | "interval">): string {
  const unit = rule.freq === "weekly" ? "week" : "month";
  return rule.interval === 1 ? unit : `${rule.interval} ${unit}s`;
}

const WORKWEEK = [1, 2, 3, 4, 5];

/** "Every weekday", "Every 2 weeks on Mon and Thu", "Every month on the 1st and 15th". */
export function describeRecurrence(rule: Recurrence, weekStartsOn: WeekStartsOn): string {
  const every = `Every ${intervalUnit(rule)}`;
  if (rule.freq === "monthly") {
    const days = [...rule.byMonthDay].sort((a, b) => a - b).map(ordinal);
    return `${every} on the ${joinWithAnd(days)}`;
  }
  const chosen = new Set(rule.byWeekday);
  if (rule.interval === 1 && chosen.size === 7) return "Every day";
  if (rule.interval === 1 && chosen.size === 5 && WORKWEEK.every((day) => chosen.has(day))) {
    return "Every weekday";
  }
  const days = weekdaysFrom(weekStartsOn)
    .filter((day) => chosen.has(day))
    .map((day) => WEEKDAY_NAME[day]?.slice(0, 3) ?? "");
  return `${every} on ${joinWithAnd(days)}`;
}

/** "Mon 7 Dec" or "Mon 7 Dec, 09:00": an occurrence's date in full, never relative. */
export function formatOccurrence(at: Date, allDay: boolean): string {
  return format(at, allDay ? "EEE d MMM" : "EEE d MMM, HH:mm");
}
