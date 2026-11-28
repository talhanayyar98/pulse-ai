import { describe, expect, it } from "vitest";
import { deriveNotifications, STUCK_AFTER_DAYS } from "@/lib/domain/notifications";
import { createTask, type Task } from "@/lib/domain/task";
import { formatAgo } from "@/lib/time-ago";

// Wednesday 2 Dec 2026, 12:00 UTC.
const now = new Date("2026-12-02T12:00:00.000Z");
const DAY = 86_400_000;

function task(overrides: Partial<Task> = {}): Task {
  const base = createTask(
    { title: "Task" },
    { id: crypto.randomUUID(), order: "a0", now: new Date("2026-11-01T00:00:00.000Z") },
  );
  return { ...base, ...overrides };
}

const kinds = (tasks: Task[]) => deriveNotifications(tasks, now).map((n) => n.kind);

describe("deriveNotifications", () => {
  it("reports overdue tasks from the moment their deadline passed", () => {
    const [overdue] = deriveNotifications([task({ dueAt: "2026-12-02T09:00:00.000Z" })], now);
    expect(overdue?.kind).toBe("overdue");
    expect(overdue?.at.toISOString()).toBe("2026-12-02T09:00:00.000Z");
  });

  it("reports tasks due within 24 hours from when they entered that window", () => {
    const [soon] = deriveNotifications([task({ dueAt: "2026-12-02T18:00:00.000Z" })], now);
    expect(soon?.kind).toBe("due_soon");
    expect(soon?.at.toISOString()).toBe("2026-12-01T18:00:00.000Z");
    expect(kinds([task({ dueAt: "2026-12-04T09:00:00.000Z" })])).toEqual([]);
  });

  it("flags work stuck in progress after a week, and only then", () => {
    const movedAt = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString();
    expect(
      kinds([task({ status: "in_progress", statusChangedAt: movedAt(STUCK_AFTER_DAYS + 2) })]),
    ).toEqual(["stuck"]);
    expect(
      kinds([task({ status: "in_progress", statusChangedAt: movedAt(STUCK_AFTER_DAYS - 1) })]),
    ).toEqual([]);
  });

  it("celebrates completions from the last 24 hours", () => {
    const done = (hoursAgo: number) =>
      task({
        status: "done",
        completedAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
      });
    expect(kinds([done(3)])).toEqual(["completed"]);
    expect(kinds([done(30)])).toEqual([]);
  });

  it("ignores deleted tasks and lists the newest first", () => {
    const result = deriveNotifications(
      [
        task({ title: "Old", dueAt: "2026-11-30T09:00:00.000Z" }),
        task({ title: "Gone", dueAt: "2026-12-02T11:00:00.000Z", deletedAt: now.toISOString() }),
        task({ title: "New", dueAt: "2026-12-02T10:00:00.000Z" }),
      ],
      now,
    );
    expect(result.map((n) => n.task.title)).toEqual(["New", "Old"]);
  });

  it("gives a rescheduled task a new id, so it counts as new again", () => {
    const base = task({ dueAt: "2026-12-02T09:00:00.000Z" });
    const [before] = deriveNotifications([base], now);
    const [after] = deriveNotifications([{ ...base, dueAt: "2026-12-02T10:00:00.000Z" }], now);
    expect(before?.id).not.toBe(after?.id);
  });
});

describe("formatAgo", () => {
  const ago = (ms: number) => formatAgo(new Date(now.getTime() - ms), now);

  it("uses compact units", () => {
    expect(ago(20_000)).toBe("Just now");
    expect(ago(5 * 60_000)).toBe("5m");
    expect(ago(3 * 3_600_000)).toBe("3h");
    expect(ago(2 * DAY)).toBe("2d");
    expect(ago(15 * DAY)).toBe("2w");
  });
});
