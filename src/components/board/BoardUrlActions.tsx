"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useUi } from "@/lib/stores/ui";

/**
 * Handles links into the board, then cleans the URL:
 * - `?new=1`, the "New task" app shortcut, opens quick add;
 * - `?task=<id>`, a clicked reminder notification, opens that task.
 */
export function BoardUrlActions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const openPalette = useUi((state) => state.openPalette);
  const openDrawer = useUi((state) => state.openDrawer);
  const newTask = searchParams.get("new") === "1";
  const taskId = searchParams.get("task");

  useEffect(() => {
    if (!newTask && !taskId) return;
    if (taskId) openDrawer(taskId);
    else openPalette("create");
    router.replace("/board");
  }, [newTask, taskId, openPalette, openDrawer, router]);

  return null;
}
