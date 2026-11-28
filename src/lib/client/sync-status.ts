"use client";

import { useIsRestoring } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useOnline } from "@/lib/hooks/use-online";
import { useOfflineClient } from "./offline/context";
import type { SyncPhase } from "./offline/sync-engine";
import { usePendingTasks } from "./pending";

/**
 * What the sync indicator shows:
 * - restoring: the last visit's data is still loading from this device (a moment);
 * - offline: no connection; edits wait on this device;
 * - signed-out: the session ended; edits wait for a sign-in;
 * - retrying: the server couldn't be reached; another attempt is scheduled;
 * - syncing: edits are on their way;
 * - synced: the server has everything.
 */
export type SyncState = "restoring" | "offline" | "signed-out" | "retrying" | "syncing" | "synced";

export function syncState(input: {
  restoring: boolean;
  online: boolean;
  phase: SyncPhase;
  pendingCount: number;
}): SyncState {
  if (input.restoring) return "restoring";
  if (!input.online) return "offline";
  if (input.phase === "signed-out") return "signed-out";
  if (input.phase === "retrying") return "retrying";
  return input.pendingCount > 0 ? "syncing" : "synced";
}

const serverPhase = (): SyncPhase => "idle";

export interface SyncStatus {
  state: SyncState;
  /** Tasks with edits the server hasn't confirmed yet. */
  pendingCount: number;
  retry: () => void;
}

export function useSyncStatus(): SyncStatus {
  const { engine } = useOfflineClient();
  const phase = useSyncExternalStore(engine.subscribe, engine.getPhase, serverPhase);
  const online = useOnline();
  const restoring = useIsRestoring();
  const pendingCount = usePendingTasks((state) => Object.keys(state.byId).length);
  return {
    state: syncState({ restoring, online, phase, pendingCount }),
    pendingCount,
    retry: () => engine.retryNow(),
  };
}
