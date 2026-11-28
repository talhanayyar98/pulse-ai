import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  readSettings,
  reminderPolicy,
  reminderSettingsChanged,
  settingsBodySchema,
} from "@/lib/domain/settings";

describe("readSettings", () => {
  it("fills fields a stored document doesn't have yet", () => {
    expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps stored values", () => {
    expect(readSettings({ weekStartsOn: 0, timeZone: "Asia/Tokyo" })).toEqual({
      ...DEFAULT_SETTINGS,
      weekStartsOn: 0,
      timeZone: "Asia/Tokyo",
    });
  });

  it("falls back to the default for each value it doesn't understand, keeping the rest", () => {
    expect(readSettings({ weekStartsOn: 3 })).toEqual(DEFAULT_SETTINGS);
    expect(
      readSettings({ weekStartsOn: 6, timeZone: "Mars/Olympus", allDayReminderTime: "9am" }),
    ).toEqual({ ...DEFAULT_SETTINGS, weekStartsOn: 6 });
  });

  it("keeps an empty list of default reminders: the user turned them off", () => {
    expect(readSettings({ defaultReminders: [] }).defaultReminders).toEqual([]);
  });
});

describe("settingsBodySchema", () => {
  const body = (settings: object) => ({ settings: { ...DEFAULT_SETTINGS, ...settings } });

  it("accepts Monday, Sunday and Saturday as the first day of the week", () => {
    for (const weekStartsOn of [1, 0, 6]) {
      expect(settingsBodySchema.safeParse(body({ weekStartsOn })).success).toBe(true);
    }
    expect(settingsBodySchema.safeParse(body({ weekStartsOn: 2 })).success).toBe(false);
  });

  it("accepts IANA time zones and 24-hour times only", () => {
    expect(settingsBodySchema.safeParse(body({ timeZone: "Europe/Paris" })).success).toBe(true);
    expect(settingsBodySchema.safeParse(body({ timeZone: "Paris" })).success).toBe(false);
    expect(settingsBodySchema.safeParse(body({ allDayReminderTime: "23:59" })).success).toBe(true);
    expect(settingsBodySchema.safeParse(body({ allDayReminderTime: "24:00" })).success).toBe(false);
  });

  it("only takes offsets as default reminders", () => {
    const absolute = { id: crypto.randomUUID(), kind: "absolute", at: "2026-12-01T09:00:00.000Z" };
    expect(settingsBodySchema.safeParse(body({ defaultReminders: [absolute] })).success).toBe(
      false,
    );
  });
});

describe("reminder settings", () => {
  it("only reminder-related changes count", () => {
    expect(
      reminderSettingsChanged(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, weekStartsOn: 0 }),
    ).toBe(false);
    expect(
      reminderSettingsChanged(DEFAULT_SETTINGS, {
        ...DEFAULT_SETTINGS,
        allDayReminderTime: "08:00",
      }),
    ).toBe(true);
    expect(
      reminderSettingsChanged(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, defaultReminders: [] }),
    ).toBe(true);
  });

  it("uses the fallback zone until one is saved", () => {
    expect(reminderPolicy(DEFAULT_SETTINGS, "Asia/Tokyo").timeZone).toBe("Asia/Tokyo");
    expect(reminderPolicy({ ...DEFAULT_SETTINGS, timeZone: "UTC" }, "Asia/Tokyo").timeZone).toBe(
      "UTC",
    );
  });
});
