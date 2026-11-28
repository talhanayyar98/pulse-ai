"use client";

import { useEffect, useRef } from "react";
import { type SyncState, useSyncStatus } from "@/lib/client/sync-status";
import { useToasts } from "@/lib/stores/toasts";
import { taskCount } from "./SyncStatus";

/**
 * Toasts (announced to screen readers) when syncing runs into trouble and when it recovers.
 * One per stretch of trouble: a failing retry every few seconds doesn't repeat it.
 */
export function SyncNotices() {
  const { state, pendingCount } = useSyncStatus();
  const push = useToasts((store) => store.push);
  const previous = useRef<SyncState>("restoring");
  const trouble = useRef<"offline" | "unreachable" | null>(null);
  /** The most tasks that were waiting during the trouble, reported once they've synced. */
  const waiting = useRef(0);

  useEffect(() => {
    const changed = state !== previous.current;
    previous.current = state;
    if (changed && state === "offline" && trouble.current !== "offline") {
      trouble.current = "offline";
      push({
        title: "You're offline",
        description: "Edits are kept on this device and sync when you reconnect.",
      });
    } else if (changed && state === "retrying" && trouble.current === null) {
      trouble.current = "unreachable";
      push({
        title: "Can't reach Pulse right now",
        description: "Your edits are safe on this device. Retrying…",
      });
    }
    if (trouble.current === null) return;

    if (state === "synced") {
      push({
        title: trouble.current === "offline" ? "Back online" : "Connected again",
        description:
          waiting.current > 0 ? `Synced your edits to ${taskCount(waiting.current)}.` : undefined,
        tone: "success",
      });
      trouble.current = null;
      waiting.current = 0;
    } else {
      waiting.current = Math.max(waiting.current, pendingCount);
    }
  }, [state, pendingCount, push]);

  return null;
}
