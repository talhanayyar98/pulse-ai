import { describe, expect, it } from "vitest";
import {
  type BoardFilters,
  hasActiveFilters,
  isDueSoon,
  isOverdue,
  matchesFilters,
  matchesHorizon,
  NO_FILTERS,
  splitDoneTasks,
} from "@/lib/domain/filters";
import { createTask, type Task } from "@/lib/domain/task";

// Wednesday 2 Dec 2026, 12:00 in Europe/London (UTC in winter). Week: Mon 30 Nov – Sun 6 Dec.
const now = new Date("2026-12-02T12:00:00.000Z");

function task(overrides: Partial<Task> = {}): Task {
  const base = createTask(
    { title: "Task" },
    { id: crypto.randomUUID(), order: "a0", now: new Date("2026-11-01T00:00:00.000Z") },
  );
  return { ...base, ...overrides };
}

describe("isOverdue / isDueSoon", () => {
  it("treats a timed task as overdue once its time has passed", () => {
    expect(isOverdue(task({ dueAt: "2026-12-02T11:59:00.000Z" }), now)).toBe(true);
    expect(isOverdue(task({ dueAt: "2026-12-02T12:01:00.000Z" }), now)).toBe(false);
  });

  it("keeps an all-day task on time until the end of its day", () => {
    expect(isOverdue(task({ dueAt: "2026-12-02T00:00:00.000Z", allDay: true }), now)).toBe(false);
    expect(isOverdue(task({ dueAt: "2026-12-01T00:00:00.000Z", allDay: true }), now)).toBe(true);
  });

  it("never marks done or undated tasks as overdue", () => {
    expect(isOverdue(task({ dueAt: "2026-11-20T09:00:00.000Z", status: "done" }), now)).toBe(false);
    expect(isOverdue(task(), now)).toBe(false);
  });

  it("flags tasks due within the next 24 hours as due soon", () => {
    expect(isDueSoon(task({ dueAt: "2026-12-03T11:00:00.000Z" }), now)).toBe(true);
    expect(isDueSoon(task({ dueAt: "2026-12-03T13:00:00.000Z" }), now)).toBe(false);
    expect(isDueSoon(task({ dueAt: "2026-12-02T00:00:00.000Z", allDay: true }), now)).toBe(true);
    expect(isDueSoon(task({ dueAt: "2026-12-02T11:00:00.000Z" }), now)).toBe(false); // overdue
  });
});

describe("matchesHorizon", () => {
  it("matches this week by planning horizon or by due date", () => {
    expect(matchesHorizon(task({ horizon: "week" }), "week", now)).toBe(true);
    expect(matchesHorizon(task({ dueAt: "2026-12-06T18:00:00.000Z" }), "week", now)).toBe(true);
    expect(matchesHorizon(task({ dueAt: "2026-12-08T09:00:00.000Z" }), "week", now)).toBe(false);
    expect(matchesHorizon(task({ horizon: "month" }), "week", now)).toBe(false);
  });

  it("makes this month a superset of this week", () => {
    expect(matchesHorizon(task({ horizon: "week" }), "month", now)).toBe(true);
    expect(matchesHorizon(task({ horizon: "month" }), "month", now)).toBe(true);
    expect(matchesHorizon(task({ dueAt: "2026-12-28T09:00:00.000Z" }), "month", now)).toBe(true);
    expect(matchesHorizon(task({ dueAt: "2027-01-04T09:00:00.000Z" }), "month", now)).toBe(false);
    expect(matchesHorizon(task(), "month", now)).toBe(false);
  });

  it("always includes overdue tasks", () => {
    const overdue = task({ dueAt: "2026-10-01T09:00:00.000Z" });
    expect(matchesHorizon(overdue, "week", now)).toBe(true);
    expect(matchesHorizon(overdue, "month", now)).toBe(true);
  });
});

describe("matchesFilters", () => {
  const filters = (overrides: Partial<BoardFilters>): BoardFilters => ({
    ...NO_FILTERS,
    ...overrides,
  });

  it("matches any of the selected priorities", () => {
    const f = filters({ priorities: ["high", "urgent"] });
    expect(matchesFilters(task({ priority: "urgent" }), f, now)).toBe(true);
    expect(matchesFilters(task({ priority: "low" }), f, now)).toBe(false);
  });

  it("matches any of the selected labels, ignoring case", () => {
    const f = filters({ labels: ["Home", "errands"] });
    expect(matchesFilters(task({ labels: ["home"] }), f, now)).toBe(true);
    expect(matchesFilters(task({ labels: ["work"] }), f, now)).toBe(false);
    expect(matchesFilters(task(), f, now)).toBe(false);
  });

  it("combines horizon, priority and label filters with AND", () => {
    const f = filters({ horizon: "week", priorities: ["high"], labels: ["work"] });
    expect(
      matchesFilters(task({ horizon: "week", priority: "high", labels: ["work"] }), f, now),
    ).toBe(true);
    expect(matchesFilters(task({ horizon: "week", priority: "high" }), f, now)).toBe(false);
  });

  it("reports whether any filter is active", () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters(filters({ labels: ["x"] }))).toBe(true);
  });
});

describe("splitDoneTasks", () => {
  it("collapses tasks completed more than 7 days ago", () => {
    const recent = task({ status: "done", completedAt: "2026-11-26T12:00:00.000Z" });
    const older = task({ status: "done", completedAt: "2026-11-24T12:00:00.000Z" });
    const unknown = task({ status: "done", completedAt: null });
    expect(splitDoneTasks([recent, older, unknown], now)).toEqual({
      recent: [recent, unknown],
      older: [older],
    });
  });
});
