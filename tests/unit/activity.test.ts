import { describe, expect, it } from "vitest";
import { deriveActivity } from "@/lib/domain/activity";
import { applyTaskPatch, createTask, markTaskDeleted } from "@/lib/domain/task";

const now = new Date("2026-12-01T09:00:00.000Z");
const later = new Date("2026-12-01T10:00:00.000Z");
const base = createTask({ title: "Draft brief" }, { id: crypto.randomUUID(), order: "a0", now });

describe("deriveActivity", () => {
  it("logs creation", () => {
    expect(deriveActivity(null, base)).toEqual([{ type: "created", payload: { status: "todo" } }]);
  });

  it("logs nothing for a task created and deleted before it ever synced", () => {
    expect(deriveActivity(null, markTaskDeleted(base, later))).toEqual([]);
  });

  it("distinguishes moved, completed and reopened", () => {
    const inProgress = applyTaskPatch(base, { status: "in_progress" }, later);
    expect(deriveActivity(base, inProgress)).toEqual([
      { type: "moved", payload: { from: "todo", to: "in_progress" } },
    ]);

    const done = applyTaskPatch(inProgress, { status: "done" }, later);
    expect(deriveActivity(inProgress, done)).toEqual([
      { type: "completed", payload: { from: "in_progress" } },
    ]);

    const reopened = applyTaskPatch(done, { status: "todo" }, later);
    expect(deriveActivity(done, reopened)).toEqual([{ type: "reopened", payload: { to: "todo" } }]);
  });

  it("logs reschedules with the old and new due dates", () => {
    const due = applyTaskPatch(base, { dueAt: later.toISOString() }, later);
    expect(deriveActivity(base, due)).toEqual([
      { type: "rescheduled", payload: { from: null, to: later.toISOString() } },
    ]);
  });

  it("lists every edited field in one updated event", () => {
    const edited = applyTaskPatch(base, { title: "Final brief", labels: ["work"] }, later);
    expect(deriveActivity(base, edited)).toEqual([
      { type: "updated", payload: { fields: ["title", "labels"] } },
    ]);
  });

  it("logs a change of repeat as an update", () => {
    const due = applyTaskPatch(base, { dueAt: "2026-12-07T09:00:00.000Z" }, later);
    const repeating = applyTaskPatch(
      due,
      { recurrence: { freq: "monthly", interval: 1, byMonthDay: [7] } },
      later,
    );
    expect(deriveActivity(due, repeating)).toEqual([
      { type: "updated", payload: { fields: ["recurrence"] } },
    ]);
  });

  it("ignores pure reordering", () => {
    expect(deriveActivity(base, applyTaskPatch(base, { order: "a1" }, later))).toEqual([]);
  });

  it("logs a deletion once", () => {
    const deleted = markTaskDeleted(base, later);
    expect(deriveActivity(base, deleted)).toEqual([{ type: "deleted", payload: {} }]);
    expect(deriveActivity(deleted, markTaskDeleted(deleted, later))).toEqual([]);
  });
});
