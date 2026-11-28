import { z } from "zod";

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
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = { weekStartsOn: 1 };

/** Request and response body of /api/settings. */
export const settingsBodySchema = z.object({ settings: settingsSchema });
export type SettingsBody = z.infer<typeof settingsBodySchema>;

/** Stored settings may predate a field (or be hand-edited): fall back to the defaults. */
export function readSettings(stored: unknown): Settings {
  const merged = typeof stored === "object" && stored !== null ? stored : {};
  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...merged });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
