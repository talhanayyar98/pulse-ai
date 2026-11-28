import { describe, expect, it } from "vitest";
import {
  affectsReminders,
  MAX_REMINDERS,
  type OffsetReminder,
  type ReminderPolicy,
  type ReminderRule,
  scheduledReminders,
  toggleOffset,
} from "@/lib/domain/reminders";
import { applyTaskPatch, createTask, markTaskDeleted, type Task } from "@/lib/domain/task";

const london: ReminderPolicy = {
  timeZone: "Europe/London",
  defaultReminders: [],
  allDayReminderTime: "09:00",
};

const offset = (amount: number, unit: OffsetReminder["unit"]): OffsetReminder => ({
  id: crypto.randomUUID(),
  kind: "offset",
  amount,
  unit,
});

function task(
  due: Partial<Pick<Task, "dueAt" | "allDay">>,
  reminders: ReminderRule[] | null,
): Task {
  const created = createTask(
    { title: "Renew passport" },
    { id: crypto.randomUUID(), order: "a0", now: new Date("2026-09-01T08:00:00.000Z") },
  );
  return { ...created, dueAt: null, allDay: false, ...due, reminders };
}

/** The fire times of one rule each, as ISO strings, in rule order. */
function fireTimes(subject: Task, policy = london): string[] {
  return scheduledReminders(subject, policy).map(({ fireAt }) => fireAt.toISOString());
}

describe("scheduledReminders", () => {
  it("counts minutes and hours back from a timed deadline", () => {
    const due = task({ dueAt: "2026-12-07T09:00:00.000Z" }, [
      offset(0, "minutes"),
      offset(15, "minutes"),
      offset(1, "hours"),
    ]);
    expect(fireTimes(due)).toEqual([
      "2026-12-07T09:00:00.000Z",
      "2026-12-07T08:45:00.000Z",
      "2026-12-07T08:00:00.000Z",
    ]);
  });

  it("keeps the wall-clock time for days and weeks across a clock change", () => {
    // UK clocks went back at 02:00 on Sun 25 Oct 2026: 09:00 is 08:00Z before, 09:00Z after.
    expect(fireTimes(task({ dueAt: "2026-10-25T09:00:00.000Z" }, [offset(1, "days")]))).toEqual([
      "2026-10-24T08:00:00.000Z",
    ]);
    expect(fireTimes(task({ dueAt: "2026-10-26T09:00:00.000Z" }, [offset(1, "weeks")]))).toEqual([
      "2026-10-19T08:00:00.000Z",
    ]);
  });

  it("keeps hours exact across a clock change", () => {
    // 03:00 GMT on the night the clocks went back is three real hours after 01:00 BST.
    expect(fireTimes(task({ dueAt: "2026-10-25T03:00:00.000Z" }, [offset(3, "hours")]))).toEqual([
      "2026-10-25T00:00:00.000Z",
    ]);
  });

  it("reminds of an all-day task relative to the all-day reminder time on its day", () => {
    const friday = task({ dueAt: "2026-12-11T00:00:00.000Z", allDay: true }, [
      offset(0, "minutes"),
      offset(1, "hours"),
      offset(1, "days"),
    ]);
    expect(fireTimes(friday)).toEqual([
      "2026-12-11T09:00:00.000Z",
      "2026-12-11T08:00:00.000Z",
      "2026-12-10T09:00:00.000Z",
    ]);
    expect(fireTimes(friday, { ...london, allDayReminderTime: "18:30" })[0]).toBe(
      "2026-12-11T18:30:00.000Z",
    );
  });

  it("keeps an all-day task's reminder time on the wall clock across a clock change", () => {
    const monday = task({ dueAt: "2026-10-26T00:00:00.000Z", allDay: true }, [
      offset(1, "days"),
      offset(2, "days"),
    ]);
    expect(fireTimes(monday)).toEqual(["2026-10-25T09:00:00.000Z", "2026-10-24T08:00:00.000Z"]);
  });

  it("works in the policy's time zone, not the machine's", () => {
    const newYork = { ...london, timeZone: "America/New_York" };
    // 09:00 in New York on Mon 7 Dec 2026 (EST, UTC-5).
    expect(
      fireTimes(task({ dueAt: "2026-12-07T14:00:00.000Z" }, [offset(1, "days")]), newYork),
    ).toEqual(["2026-12-06T14:00:00.000Z"]);
    // All day on Fri 11 Dec there: local midnight is 05:00Z, the reminder 09:00 local.
    expect(
      fireTimes(
        task({ dueAt: "2026-12-11T05:00:00.000Z", allDay: true }, [offset(0, "minutes")]),
        newYork,
      ),
    ).toEqual(["2026-12-11T14:00:00.000Z"]);
  });

  it("fires an absolute reminder at its moment, with or without a due date", () => {
    const at: ReminderRule = {
      id: crypto.randomUUID(),
      kind: "absolute",
      at: "2026-12-05T18:00:00.000Z",
    };
    expect(fireTimes(task({}, [at]))).toEqual(["2026-12-05T18:00:00.000Z"]);
    expect(fireTimes(task({ dueAt: "2026-12-07T09:00:00.000Z" }, [at]))).toEqual([
      "2026-12-05T18:00:00.000Z",
    ]);
  });

  it("skips offsets while the task has no due date", () => {
    expect(fireTimes(task({}, [offset(1, "hours")]))).toEqual([]);
  });

  it("uses the defaults when the task has no reminders of its own, and none for an empty list", () => {
    const policy = { ...london, defaultReminders: [offset(1, "hours")] };
    const due = { dueAt: "2026-12-07T09:00:00.000Z" };
    expect(fireTimes(task(due, null), policy)).toEqual(["2026-12-07T08:00:00.000Z"]);
    expect(fireTimes(task(due, []), policy)).toEqual([]);
  });

  it("silences finished and deleted tasks", () => {
    const due = task({ dueAt: "2026-12-07T09:00:00.000Z" }, [offset(1, "hours")]);
    const now = new Date("2026-12-01T09:00:00.000Z");
    expect(fireTimes(applyTaskPatch(due, { status: "done" }, now))).toEqual([]);
    expect(fireTimes(markTaskDeleted(due, now))).toEqual([]);
  });

  it("names each time after its rule", () => {
    const rule = offset(1, "hours");
    expect(scheduledReminders(task({ dueAt: "2026-12-07T09:00:00.000Z" }, [rule]), london)).toEqual(
      [{ ruleId: rule.id, fireAt: new Date("2026-12-07T08:00:00.000Z") }],
    );
  });
});

describe("affectsReminders", () => {
  const now = new Date("2026-12-01T09:00:00.000Z");
  const due = task({ dueAt: "2026-12-07T09:00:00.000Z" }, null);

  it("is true for a new task and for changes to the due date, reminders or completion", () => {
    expect(affectsReminders(null, due)).toBe(true);
    expect(affectsReminders(due, applyTaskPatch(due, { dueAt: null }, now))).toBe(true);
    expect(affectsReminders(due, applyTaskPatch(due, { allDay: true }, now))).toBe(true);
    expect(affectsReminders(due, applyTaskPatch(due, { reminders: [] }, now))).toBe(true);
    expect(affectsReminders(due, applyTaskPatch(due, { status: "done" }, now))).toBe(true);
    expect(affectsReminders(due, markTaskDeleted(due, now))).toBe(true);
  });

  it("is false for edits that can't move a reminder", () => {
    expect(affectsReminders(due, applyTaskPatch(due, { title: "Renew both passports" }, now))).toBe(
      false,
    );
    expect(affectsReminders(due, applyTaskPatch(due, { status: "in_progress" }, now))).toBe(false);
  });
});

describe("toggleOffset", () => {
  const hour = offset(1, "hours");

  it("adds a missing offset and removes a present one", () => {
    const id = crypto.randomUUID();
    expect(toggleOffset([hour], { amount: 1, unit: "days" }, id)).toEqual([
      hour,
      { id, kind: "offset", amount: 1, unit: "days" },
    ]);
    expect(toggleOffset([hour], { amount: 1, unit: "hours" }, id)).toEqual([]);
  });

  it("adds nothing to a full list", () => {
    const full = Array.from({ length: MAX_REMINDERS }, (_, index) => offset(index + 1, "minutes"));
    expect(toggleOffset(full, { amount: 1, unit: "weeks" }, crypto.randomUUID())).toEqual(full);
  });
});
