"use client";

import { useEffect } from "react";
import { isOverdue } from "@/lib/domain/filters";
import { useNow } from "@/lib/hooks/use-now";
import { useTasks } from "./tasks";

/** Number of open tasks past their deadline (unfiltered); recomputed every minute. */
export function useOverdueCount(): number {
  const { data: tasks = [] } = useTasks();
  const now = useNow();
  return tasks.filter((task) => isOverdue(task, now)).length;
}

/**
 * Mirrors the overdue count onto the installed app's Dock / taskbar icon (Badging API:
 * Chrome and Edge installed apps, Safari web apps on macOS Sonoma+). No-op elsewhere.
 */
export function useAppBadge(count: number): void {
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    const update = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
    // Browsers may refuse (e.g. permission not granted); the badge is a nicety, not a feature.
    update.catch(() => undefined);
  }, [count]);
}
