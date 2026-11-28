import { describe, expect, it } from "vitest";
import { syncState } from "@/lib/client/sync-status";

const base = { restoring: false, online: true, phase: "idle", pendingCount: 0 } as const;

describe("syncState", () => {
  it("is synced when nothing waits, and syncing while edits are on their way", () => {
    expect(syncState(base)).toBe("synced");
    expect(syncState({ ...base, pendingCount: 2 })).toBe("syncing");
    expect(syncState({ ...base, phase: "syncing", pendingCount: 1 })).toBe("syncing");
  });

  it("says offline before anything else the engine reports", () => {
    expect(syncState({ ...base, online: false, phase: "retrying", pendingCount: 3 })).toBe(
      "offline",
    );
  });

  it("surfaces a failing server and an ended session", () => {
    expect(syncState({ ...base, phase: "retrying", pendingCount: 1 })).toBe("retrying");
    expect(syncState({ ...base, phase: "signed-out", pendingCount: 1 })).toBe("signed-out");
  });

  it("shows nothing definite until the saved data is back", () => {
    expect(syncState({ ...base, restoring: true, online: false })).toBe("restoring");
  });
});
