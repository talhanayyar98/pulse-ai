import { describe, expect, it } from "vitest";
import {
  dayKey,
  entriesByDay,
  formatDayRange,
  monthWeeks,
  parseDayKey,
  rescheduleTo,
  unscheduledTasks,
  weekDays,
} from "@/lib/domain/calendar";
import { createTask, type Task, taskSchema } from "@/lib/domain/task";

// Tests run in Europe/London. Wed 2 Dec 2026, 12:00.
const local = (month: number, day: number, hours = 0, minutes = 0, year = 2026) =>
  new Date(year, month - 1, day, hours, minutes);
const now = local(12, 2, 12);

function task(overrides: Partial<Task> = {}): Task {
  const base = createTask(
    { title: overrides.title ?? "Task" },
    { id: crypto.randomUUID(), order: "a0", now: local(11, 1) },
  );
  return taskSchema.parse({ ...base, ...overrides });
}

describe("day keys", () => {
  it("round-trip a local day", () => {
    expect(dayKey(local(12, 7, 23, 30))).toBe("2026-12-07");
    expect(parseDayKey("2026-12-07")).toEqual(local(12, 7));
  });

  it("reject anything that isn't a date", () => {
    expect(parseDayKey("next week")).toBeNull();
    expect(parseDayKey("2026-02-31")).toBeNull();
  });
});

describe("weekDays", () => {
  it("starts on the user's first day of the week", () => {
    expect(weekDays(now, 1).map(dayKey)).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
      "2026-12-04",
      "2026-12-05",
      "2026-12-06",
    ]);
    expect(weekDays(now, 0).map(dayKey)[0]).toBe("2026-11-29");
    expect(weekDays(now, 6).map(dayKey)[0]).toBe("2026-11-28");
  });
});

describe("monthWeeks", () => {
  it("covers the month in whole weeks", () => {
    const weeks = monthWeeks(now, 1);
    expect(weeks).toHaveLength(5);
    expect(dayKey(weeks[0]?.[0] ?? now)).toBe("2026-11-30");
    expect(dayKey(weeks.at(-1)?.at(-1) ?? now)).toBe("2027-01-03");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("uses four rows for a February that fits exactly, six when the month needs them", () => {
    expect(monthWeeks(local(2, 10, 0, 0, 2027), 1)).toHaveLength(4); // 1 Feb 2027 is a Monday
    expect(monthWeeks(local(8, 10), 1)).toHaveLength(6); // Aug 2026: Sat 1st to Mon 31st
  });
});

describe("formatDayRange", () => {
  it("only repeats the month and year when they change", () => {
    expect(formatDayRange(local(12, 7), local(12, 13))).toBe("7 – 13 Dec 2026");
    expect(formatDayRange(local(11, 30), local(12, 6))).toBe("30 Nov – 6 Dec 2026");
    expect(formatDayRange(local(12, 28), local(1, 3, 0, 0, 2027))).toBe("28 Dec 2026 – 3 Jan 2027");
  });
});

describe("rescheduleTo", () => {
  it("keeps a timed task's time of day", () => {
    const timed = { dueAt: local(12, 2, 9, 15).toISOString(), allDay: false };
    expect(rescheduleTo(timed, local(12, 4))).toEqual({
      dueAt: local(12, 4, 9, 15).toISOString(),
      allDay: false,
    });
  });

  it("makes all-day and undated tasks due all day", () => {
    const allDay = { dueAt: local(12, 2).toISOString(), allDay: true };
    expect(rescheduleTo(allDay, local(12, 4))).toEqual({
      dueAt: local(12, 4).toISOString(),
      allDay: true,
    });
    expect(rescheduleTo({ dueAt: null, allDay: false }, local(12, 4))).toEqual({
      dueAt: local(12, 4).toISOString(),
      allDay: true,
    });
  });
});

describe("entriesByDay", () => {
  const days = weekDays(now, 1);

  it("puts tasks on their day: open first, all-day before timed, then by time", () => {
    const late = task({ title: "Late", dueAt: local(12, 3, 17).toISOString() });
    const early = task({ title: "Early", dueAt: local(12, 3, 8).toISOString() });
    const allDay = task({ title: "All day", dueAt: local(12, 3).toISOString(), allDay: true });
    const done = task({ title: "Done", dueAt: local(12, 3, 7).toISOString(), status: "done" });
    const outside = task({ title: "Next week", dueAt: local(12, 9).toISOString() });

    const byDay = entriesByDay([late, done, early, outside, allDay], days, now, 1);
    expect(byDay.get("2026-12-03")?.map((entry) => entry.task.title)).toEqual([
      "All day",
      "Early",
      "Late",
      "Done",
    ]);
    expect([...byDay.values()].flat()).toHaveLength(4);
  });

  it("adds projected occurrences of repeating tasks from now on", () => {
    const repeating = task({
      title: "Stand-up",
      dueAt: local(11, 30, 9).toISOString(),
      recurrence: { freq: "weekly", interval: 1, byWeekday: [1, 3, 5] },
    });
    const byDay = entriesByDay([repeating], days, now, 1);
    const kinds = (key: string) => byDay.get(key)?.map((entry) => entry.kind);

    expect(kinds("2026-11-30")).toEqual(["task"]);
    // Today's 09:00 has passed (it's noon): completing Monday's would skip straight to Friday.
    expect(kinds("2026-12-02")).toEqual([]);
    expect(kinds("2026-12-04")).toEqual(["projected"]);
    expect(byDay.get("2026-12-04")?.[0]?.key).toBe(`${repeating.id}:2026-12-04`);
  });
});

describe("unscheduledTasks", () => {
  it("lists open undated tasks: this week first, then this month, then by status", () => {
    const tasks = [
      task({ title: "Backlog idea", status: "backlog" }),
      task({ title: "Dated", dueAt: local(12, 3).toISOString(), allDay: true }),
      task({ title: "Month", horizon: "month" }),
      task({ title: "Finished", status: "done" }),
      task({ title: "In flight", status: "in_progress" }),
      task({ title: "Week", horizon: "week" }),
    ];
    expect(unscheduledTasks(tasks).map((item) => item.title)).toEqual([
      "Week",
      "Month",
      "In flight",
      "Backlog idea",
    ]);
  });
});
