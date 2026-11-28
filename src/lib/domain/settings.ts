import { z } from "zod";
import {
  defaultRemindersSchema,
  isTimeZone,
  type ReminderPolicy,
  timeOfDaySchema,
} from "./reminders";

/** The days a week may start on, numbered as date-fns does (0 = Sunday). */
export const WEEK_START_DAYS = [1, 0, 6] as const;
export type WeekStartsOn = (typeof WEEK_START_DAYS)[number];

export const WEEK_START_LABEL: Record<WeekStartsOn, string> = {
  1: "Monday",
  0: "Sunday",
  6: "Saturday",
};

/** Per-user preferences, stored on the user so every device agrees. */
export const settingsSchema = z.object({
  weekStartsOn: z.literal(WEEK_START_DAYS),
  /**
   * The zone reminders are worked out in on the server. Null until a device reports its own,
   * which the app does by itself the first time it loads the settings.
   */
  timeZone: z.string().refine(isTimeZone, "Unknown time zone").nullable(),
  /** What a task with a due date is reminded of unless it has reminders of its own. */
  defaultReminders: defaultRemindersSchema,
  /** All-day tasks are reminded relative to this time on their day ("HH:mm"). */
  allDayReminderTime: timeOfDaySchema,
});
export type Settings = z.infer<typeof settingsSchema>;

/** The id of the out-of-the-box "1 hour before" default, fixed so every reader agrees on it. */
const DEFAULT_REMINDER_ID = "00000000-0000-4000-8000-000000000001";

export const DEFAULT_SETTINGS: Settings = {
  weekStartsOn: 1,
  timeZone: null,
  defaultReminders: [{ id: DEFAULT_REMINDER_ID, kind: "offset", amount: 1, unit: "hours" }],
  allDayReminderTime: "09:00",
};

/** Request and response body of /api/settings. */
export const settingsBodySchema = z.object({ settings: settingsSchema });
export type SettingsBody = z.infer<typeof settingsBodySchema>;

/** Stored settings may predate a field (or be hand-edited): each one falls back to its default. */
export function readSettings(stored: unknown): Settings {
  const record: Record<string, unknown> =
    typeof stored === "object" && stored !== null ? { ...stored } : {};
  const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const [key, field] of Object.entries(settingsSchema.shape)) {
    if (field.safeParse(record[key]).success) settings[key] = record[key];
  }
  return settingsSchema.parse(settings);
}

/** Settings whose change can move reminder times of tasks that didn't change themselves. */
export function reminderSettingsChanged(previous: Settings, next: Settings): boolean {
  return (
    previous.timeZone !== next.timeZone ||
    previous.allDayReminderTime !== next.allDayReminderTime ||
    JSON.stringify(previous.defaultReminders) !== JSON.stringify(next.defaultReminders)
  );
}

/** The reminder policy of these settings; `fallbackZone` stands in until a zone is saved. */
export function reminderPolicy(settings: Settings, fallbackZone: string): ReminderPolicy {
  return {
    timeZone: settings.timeZone ?? fallbackZone,
    defaultReminders: settings.defaultReminders,
    allDayReminderTime: settings.allDayReminderTime,
  };
}
