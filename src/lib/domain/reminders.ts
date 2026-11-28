import { tz } from "@date-fns/tz";
import { set, startOfDay, subDays, subHours, subMinutes, subWeeks } from "date-fns";
import { z } from "zod";
import type { Task } from "./task";

/*
 * A task's reminders are rules; the moments they fire are worked out from the task's due date
 * whenever it changes (on the server, which sends them, and on the device, which shows them).
 */

export const REMINDER_UNITS = ["minutes", "hours", "days", "weeks"] as const;
export type ReminderUnit = (typeof REMINDER_UNITS)[number];

/** Per task, and in the defaults. */
export const MAX_REMINDERS = 5;

/** "2 days before" the deadline; 0 means at the deadline itself. */
export const offsetReminderSchema = z.object({
  id: z.uuid(),
  kind: z.literal("offset"),
  amount: z.int().min(0).max(99),
  unit: z.enum(REMINDER_UNITS),
});
export type OffsetReminder = z.infer<typeof offsetReminderSchema>;

/** A fixed moment, which needs no due date. */
export const absoluteReminderSchema = z.object({
  id: z.uuid(),
  kind: z.literal("absolute"),
  at: z.iso.datetime(),
});
export type AbsoluteReminder = z.infer<typeof absoluteReminderSchema>;

export const reminderRuleSchema = z.discriminatedUnion("kind", [
  offsetReminderSchema,
  absoluteReminderSchema,
]);
export type ReminderRule = z.infer<typeof reminderRuleSchema>;

const distinctIds = (rules: readonly { id: string }[]) =>
  new Set(rules.map((rule) => rule.id)).size === rules.length;

export const reminderRulesSchema = z
  .array(reminderRuleSchema)
  .max(MAX_REMINDERS)
  .refine(distinctIds, "Repeated reminder id");

export const defaultRemindersSchema = z
  .array(offsetReminderSchema)
  .max(MAX_REMINDERS)
  .refine(distinctIds, "Repeated reminder id");

/** "HH:mm", 24-hour. */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");

export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** What the reminder times of a user's tasks depend on, besides the tasks themselves. */
export interface ReminderPolicy {
  /** IANA zone that day and week offsets, and all-day tasks, are reckoned in. */
  timeZone: string;
  /** Used by tasks whose `reminders` is null. */
  defaultReminders: readonly OffsetReminder[];
  /** All-day tasks are reminded relative to this time on their day. */
  allDayReminderTime: string;
}

export interface ScheduledReminder {
  ruleId: string;
  fireAt: Date;
}

/** The task's own rules, or the user's defaults when it has none of its own (null). */
export function effectiveReminders(
  task: Pick<Task, "reminders">,
  policy: ReminderPolicy,
): readonly ReminderRule[] {
  return task.reminders ?? policy.defaultReminders;
}

/**
 * What offsets count back from: the deadline of a timed task, or the all-day reminder time on
 * an all-day task's day (so "1 day before" a Friday task is Thursday at 09:00).
 */
export function reminderAnchor(
  task: Pick<Task, "dueAt" | "allDay">,
  policy: ReminderPolicy,
): Date | null {
  if (!task.dueAt) return null;
  if (!task.allDay) return new Date(task.dueAt);
  const [hours = 0, minutes = 0] = policy.allDayReminderTime.split(":").map(Number);
  const inZone = tz(policy.timeZone);
  const day = startOfDay(task.dueAt, { in: inZone });
  return new Date(set(day, { hours, minutes }, { in: inZone }).getTime());
}

/**
 * Minutes and hours are exact durations; days and weeks keep the time of day on the wall
 * clock, so "1 day before" a Monday 09:00 deadline is Sunday 09:00 even when the clocks change
 * overnight.
 */
function countBack(anchor: Date, rule: OffsetReminder, timeZone: string): Date {
  const inZone = { in: tz(timeZone) };
  switch (rule.unit) {
    case "minutes":
      return subMinutes(anchor, rule.amount);
    case "hours":
      return subHours(anchor, rule.amount);
    case "days":
      return new Date(subDays(anchor, rule.amount, inZone).getTime());
    case "weeks":
      return new Date(subWeeks(anchor, rule.amount, inZone).getTime());
  }
}

/** When a rule fires for this task, or null if it can't (an offset on an undated task). */
export function fireTime(
  task: Pick<Task, "dueAt" | "allDay">,
  rule: ReminderRule,
  policy: ReminderPolicy,
): Date | null {
  if (rule.kind === "absolute") return new Date(rule.at);
  const anchor = reminderAnchor(task, policy);
  return anchor && countBack(anchor, rule, policy.timeZone);
}

/**
 * Every moment the task's reminders fire, past ones included. Finished and deleted tasks have
 * none: completing a task silences it.
 */
export function scheduledReminders(task: Task, policy: ReminderPolicy): ScheduledReminder[] {
  if (task.deletedAt || task.status === "done") return [];
  return effectiveReminders(task, policy).flatMap((rule) => {
    const fireAt = fireTime(task, rule, policy);
    return fireAt ? [{ ruleId: rule.id, fireAt }] : [];
  });
}

/** True when a change from `previous` to `next` can move, add or remove reminder times. */
export function affectsReminders(previous: Task | null, next: Task): boolean {
  if (previous === null) return true;
  const silenced = (task: Task) => task.status === "done" || task.deletedAt !== null;
  return (
    previous.dueAt !== next.dueAt ||
    previous.allDay !== next.allDay ||
    silenced(previous) !== silenced(next) ||
    JSON.stringify(previous.reminders) !== JSON.stringify(next.reminders)
  );
}
