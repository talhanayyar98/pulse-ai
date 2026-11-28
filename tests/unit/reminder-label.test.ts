import { describe, expect, it } from "vitest";
import {
  ALL_DAY_PRESETS,
  byLeadTime,
  describeOffset,
  shortOffset,
  TIMED_PRESETS,
} from "@/lib/reminder-label";

describe("reminder labels", () => {
  it("says how long before, in words", () => {
    expect(describeOffset({ amount: 0, unit: "minutes" }, false)).toBe("At the deadline");
    expect(describeOffset({ amount: 0, unit: "minutes" }, true)).toBe("On the day");
    expect(describeOffset({ amount: 1, unit: "hours" }, false)).toBe("1 hour before");
    expect(describeOffset({ amount: 15, unit: "minutes" }, false)).toBe("15 minutes before");
    expect(describeOffset({ amount: 2, unit: "weeks" }, true)).toBe("2 weeks before");
  });

  it("fits each toggle in a few characters", () => {
    expect(TIMED_PRESETS.map((preset) => shortOffset(preset, false))).toEqual([
      "Due time",
      "5 min",
      "15 min",
      "30 min",
      "1 hr",
      "2 hr",
      "1 day",
      "2 days",
      "1 wk",
    ]);
    expect(ALL_DAY_PRESETS.map((preset) => shortOffset(preset, true))[0]).toBe("On the day");
  });

  it("orders offsets nearest the deadline first", () => {
    const shuffled = [...TIMED_PRESETS].reverse();
    expect(shuffled.sort(byLeadTime)).toEqual(TIMED_PRESETS);
  });
});
