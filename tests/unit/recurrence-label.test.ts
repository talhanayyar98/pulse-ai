import { describe, expect, it } from "vitest";
import type { Recurrence } from "@/lib/domain/recurrence";
import {
  describeRecurrence,
  formatOccurrence,
  ordinal,
  weekdaysFrom,
} from "@/lib/recurrence-label";

describe("describeRecurrence", () => {
  it("lists weekdays from the user's first day of the week", () => {
    const rule: Recurrence = { freq: "weekly", interval: 1, byWeekday: [0, 4, 1] };
    expect(describeRecurrence(rule, 1)).toBe("Every week on Mon, Thu and Sun");
    expect(describeRecurrence(rule, 0)).toBe("Every week on Sun, Mon and Thu");
  });

  it("names intervals, every day and the working week", () => {
    expect(describeRecurrence({ freq: "weekly", interval: 2, byWeekday: [1] }, 1)).toBe(
      "Every 2 weeks on Mon",
    );
    expect(
      describeRecurrence({ freq: "weekly", interval: 1, byWeekday: [0, 1, 2, 3, 4, 5, 6] }, 1),
    ).toBe("Every day");
    expect(describeRecurrence({ freq: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5] }, 1)).toBe(
      "Every weekday",
    );
  });

  it("lists days of the month in order, as ordinals", () => {
    expect(describeRecurrence({ freq: "monthly", interval: 1, byMonthDay: [15, 1] }, 1)).toBe(
      "Every month on the 1st and 15th",
    );
    expect(describeRecurrence({ freq: "monthly", interval: 3, byMonthDay: [31] }, 1)).toBe(
      "Every 3 months on the 31st",
    );
  });
});

describe("ordinal", () => {
  it("uses st, nd, rd and th, including the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "30th",
      "31st",
    ]);
  });
});

describe("weekdaysFrom", () => {
  it("rotates the week to start on the chosen day", () => {
    expect(weekdaysFrom(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekdaysFrom(6)).toEqual([6, 0, 1, 2, 3, 4, 5]);
  });
});

describe("formatOccurrence", () => {
  it("shows the full date, with the time for timed tasks", () => {
    const at = new Date(2026, 11, 7, 9, 30);
    expect(formatOccurrence(at, true)).toBe("Mon 7 Dec");
    expect(formatOccurrence(at, false)).toBe("Mon 7 Dec, 09:30");
  });
});
