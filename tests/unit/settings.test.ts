import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, readSettings, settingsBodySchema } from "@/lib/domain/settings";

describe("readSettings", () => {
  it("fills fields a stored document doesn't have yet", () => {
    expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps stored values", () => {
    expect(readSettings({ weekStartsOn: 0 })).toEqual({ weekStartsOn: 0 });
  });

  it("falls back to the defaults for a value it doesn't understand", () => {
    expect(readSettings({ weekStartsOn: 3 })).toEqual(DEFAULT_SETTINGS);
  });
});

describe("settingsBodySchema", () => {
  it("accepts Monday, Sunday and Saturday as the first day of the week", () => {
    for (const weekStartsOn of [1, 0, 6]) {
      expect(settingsBodySchema.safeParse({ settings: { weekStartsOn } }).success).toBe(true);
    }
    expect(settingsBodySchema.safeParse({ settings: { weekStartsOn: 2 } }).success).toBe(false);
  });
});
