"use client";

import { useCallback } from "react";
import { useTaskActions } from "@/lib/client/tasks";
import { rescheduleTo } from "@/lib/domain/calendar";
import type { Task } from "@/lib/domain/task";
import { useToasts } from "@/lib/stores/toasts";
import { dayOfTarget } from "./targets";

/** Saves a calendar drop: onto a day sets the due date, onto the tray clears it. */
export function useCalendarDrop(): (task: Task, target: string) => void {
  const actions = useTaskActions();
  const pushToast = useToasts((state) => state.push);
  return useCallback(
    (task, target) => {
      const day = dayOfTarget(target);
      if (day) {
        actions.update(task.id, rescheduleTo(task, day));
        return;
      }
      actions.update(task.id, { dueAt: null, allDay: false });
      if (task.recurrence) {
        pushToast({
          title: "No longer repeats",
          description: "A repeating task needs a due date.",
        });
      }
    },
    [actions, pushToast],
  );
}
