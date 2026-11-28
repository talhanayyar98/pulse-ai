import { describe, expect, it } from "vitest";
import { nextOccurrence, type Recurrence, recurrenceSchema } from "@/lib/domain/recurrence";

// Tests run in Europe/London (vitest.config.ts). Months are 0-based, as in Date.
const local = (year: number, month: number, day: number, hours = 0, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes);

const MON = 1;
const WED = 3;
const THU = 4;
const SUN = 0;

const weekly = (byWeekday: number[], interval = 1): Recurrence => ({
  freq: "weekly",
  interval,
  byWeekday,
});
const monthly = (byMonthDay: number[], interval = 1): Recurrence => ({
  freq: "monthly",
  interval,
  byMonthDay,
});

describe("nextOccurrence: weekly", () => {
  it("moves to the same weekday next week, keeping the time", () => {
    expect(nextOccurrence(weekly([MON]), local(2026, 11, 30, 9, 30), 1)).toEqual(
      local(2026, 12, 7, 9, 30),
    );
  });

  it("visits each chosen weekday in turn", () => {
    const rule = weekly([THU, MON]);
    expect(nextOccurrence(rule, local(2026, 11, 30), 1)).toEqual(local(2026, 12, 3));
    expect(nextOccurrence(rule, local(2026, 12, 3), 1)).toEqual(local(2026, 12, 7));
  });

  it("skips weeks for an interval, after finishing the current week", () => {
    const rule = weekly([MON, WED], 2);
    expect(nextOccurrence(rule, local(2026, 11, 30), 1)).toEqual(local(2026, 12, 2));
    expect(nextOccurrence(rule, local(2026, 12, 2), 1)).toEqual(local(2026, 12, 14));
  });

  it("counts interval weeks from the user's first day of the week", () => {
    // Sun 6 Dec ends a Monday-first week but starts a Sunday-first one.
    const rule = weekly([SUN, MON], 2);
    expect(nextOccurrence(rule, local(2026, 12, 6), 1)).toEqual(local(2026, 12, 14));
    expect(nextOccurrence(rule, local(2026, 12, 6), 0)).toEqual(local(2026, 12, 7));
  });

  it("continues from an occurrence that was moved off the pattern", () => {
    expect(nextOccurrence(weekly([MON]), local(2026, 12, 3), 1)).toEqual(local(2026, 12, 7));
  });

  it("keeps the wall-clock time across a daylight-saving change", () => {
    // Clocks go forward on Sun 28 Mar 2027: 09:00 GMT, then 09:00 BST.
    const after = nextOccurrence(weekly([MON]), local(2027, 3, 22, 9), 1);
    expect(after).toEqual(local(2027, 3, 29, 9));
    expect(after.toISOString()).toBe("2027-03-29T08:00:00.000Z");
  });
});

describe("nextOccurrence: monthly", () => {
  it("visits each chosen day of the month in turn", () => {
    const rule = monthly([15, 1]);
    expect(nextOccurrence(rule, local(2026, 12, 1, 18), 1)).toEqual(local(2026, 12, 15, 18));
    expect(nextOccurrence(rule, local(2026, 12, 15, 18), 1)).toEqual(local(2027, 1, 1, 18));
  });

  it("puts a day past the end of a short month on its last day", () => {
    const rule = monthly([31]);
    expect(nextOccurrence(rule, local(2027, 1, 31), 1)).toEqual(local(2027, 2, 28));
    expect(nextOccurrence(rule, local(2027, 2, 28), 1)).toEqual(local(2027, 3, 31));
    expect(nextOccurrence(monthly([30]), local(2028, 1, 30), 1)).toEqual(local(2028, 2, 29));
  });

  it("counts two days that clamp to the same date once", () => {
    const rule = monthly([30, 31]);
    expect(nextOccurrence(rule, local(2027, 1, 31), 1)).toEqual(local(2027, 2, 28));
    expect(nextOccurrence(rule, local(2027, 2, 28), 1)).toEqual(local(2027, 3, 30));
  });

  it("skips months for an interval", () => {
    expect(nextOccurrence(monthly([10], 3), local(2027, 1, 10), 1)).toEqual(local(2027, 4, 10));
  });

  it("continues from an occurrence that was moved off the pattern", () => {
    expect(nextOccurrence(monthly([15]), local(2027, 1, 20), 1)).toEqual(local(2027, 2, 15));
  });
});

describe("recurrenceSchema", () => {
  it("accepts weekly and monthly rules", () => {
    expect(recurrenceSchema.safeParse(weekly([MON, THU], 2)).success).toBe(true);
    expect(recurrenceSchema.safeParse(monthly([1, 31], 12)).success).toBe(true);
  });

  it.each([
    ["no weekdays", weekly([])],
    ["a repeated weekday", weekly([MON, MON])],
    ["a weekday out of range", weekly([7])],
    ["no month days", monthly([])],
    ["a month day out of range", monthly([32])],
    ["an interval of zero", weekly([MON], 0)],
    ["an interval over twelve", monthly([1], 13)],
  ])("rejects %s", (_name, rule) => {
    expect(recurrenceSchema.safeParse(rule).success).toBe(false);
  });
});
