import { beforeEach, describe, expect, it } from "vitest";
import { usePendingTasks, withPending } from "@/lib/client/pending";
import { applyTaskPatch, createTask, markTaskDeleted } from "@/lib/domain/task";

const t0 = new Date("2026-12-01T09:00:00.000Z");
const later = (ms: number) => new Date(t0.getTime() + ms);
const task = createTask(
  { title: "Book flights" },
  { id: crypto.randomUUID(), order: "a0", now: t0 },
);

beforeEach(() => usePendingTasks.getState().clear());

describe("pending edits", () => {
  it("settles a snapshot only while it is still the newest edit", () => {
    const store = usePendingTasks.getState();
    const first = applyTaskPatch(task, { title: "Book flights to Lisbon" }, later(1));
    const second = applyTaskPatch(first, { priority: "high" }, later(2));
    store.put(first);
    store.put(second);

    store.settle(first);
    expect(usePendingTasks.getState().byId[task.id]).toBe(second);
    store.settle(second);
    expect(usePendingTasks.getState().byId).toEqual({});
  });

  it("restores saved edits without replacing a newer one made since", () => {
    const saved = applyTaskPatch(task, { title: "Saved offline" }, later(1));
    const newer = applyTaskPatch(task, { title: "Typed just now" }, later(2));
    const other = createTask(
      { title: "Renew passport" },
      { id: crypto.randomUUID(), order: "a1", now: t0 },
    );
    usePendingTasks.getState().put(newer);

    usePendingTasks.getState().restore([saved, other]);

    expect(usePendingTasks.getState().byId).toEqual({ [task.id]: newer, [other.id]: other });
  });

  it("overlays edits, including deletions, on the server's tasks", () => {
    const deleted = markTaskDeleted(task, later(1));
    const created = createTask(
      { title: "Renew passport" },
      { id: crypto.randomUUID(), order: "a1", now: t0 },
    );
    const shown = withPending([task], { [task.id]: deleted, [created.id]: created });
    expect(shown).toEqual([deleted, created]);
  });
});
