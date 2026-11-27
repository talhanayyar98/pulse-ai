import { describe, expect, it } from "vitest";
import { dueToInputs, formatDue, inputsToDue } from "@/lib/due-date";

// vitest.config.ts pins TZ=Europe/London so local-time conversions are deterministic.
const now = new Date("2026-12-02T12:00:00.000Z"); // Wednesday

describe("inputsToDue / dueToInputs", () => {
  it("treats a date without a time as all-day at local midnight", () => {
    expect(inputsToDue("2026-12-05", "")).toEqual({
      dueAt: "2026-12-05T00:00:00.000Z",
      allDay: true,
    });
  });

  it("converts local date and time to an instant (BST in summer)", () => {
    expect(inputsToDue("2026-07-01", "09:30")).toEqual({
      dueAt: "2026-07-01T08:30:00.000Z",
      allDay: false,
    });
  });

  it("clears the due date when the date is empty or invalid", () => {
    expect(inputsToDue("", "09:30")).toEqual({ dueAt: null, allDay: false });
    expect(inputsToDue("not-a-date", "")).toEqual({ dueAt: null, allDay: false });
  });

  it("round-trips back to input values", () => {
    expect(dueToInputs(inputsToDue("2026-07-01", "09:30"))).toEqual({
      date: "2026-07-01",
      time: "09:30",
    });
    expect(dueToInputs(inputsToDue("2026-12-05", ""))).toEqual({ date: "2026-12-05", time: "" });
    expect(dueToInputs({ dueAt: null, allDay: false })).toEqual({ date: "", time: "" });
  });
});

describe("formatDue", () => {
  const at = (iso: string, allDay = false) => formatDue({ dueAt: iso, allDay }, now);

  it("uses relative words near today", () => {
    expect(at("2026-12-02T14:30:00.000Z")).toBe("Today 14:30");
    expect(at("2026-12-03T00:00:00.000Z", true)).toBe("Tomorrow");
    expect(at("2026-12-01T08:00:00.000Z")).toBe("Yesterday 08:00");
  });

  it("uses the weekday within the next week, then dates", () => {
    expect(at("2026-12-04T00:00:00.000Z", true)).toBe("Fri");
    expect(at("2026-12-20T00:00:00.000Z", true)).toBe("20 Dec");
    expect(at("2027-01-03T00:00:00.000Z", true)).toBe("3 Jan 2027");
  });

  it("returns null when there is no due date", () => {
    expect(formatDue({ dueAt: null, allDay: false }, now)).toBeNull();
  });
});
