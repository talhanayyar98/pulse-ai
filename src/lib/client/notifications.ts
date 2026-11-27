"use client";

import { useEffect, useMemo } from "react";
import { deriveNotifications, type TaskNotification } from "@/lib/domain/notifications";
import { useNow } from "@/lib/hooks/use-now";
import { useNotificationState } from "@/lib/stores/notifications";
import { useTasks } from "./tasks";

export interface NotificationView extends TaskNotification {
  /** Not opened or marked as read yet: highlighted in the panel. */
  unread: boolean;
  /** Arrived since the panel was last opened: counted on the bell. */
  unseen: boolean;
}

/** Live notifications for the signed-in user, with this device's seen/read state applied. */
export function useNotifications(): { items: NotificationView[]; unseenCount: number } {
  const { data: tasks } = useTasks();
  const nowMs = useNow().getTime();
  const seen = useNotificationState((state) => state.seen);
  const read = useNotificationState((state) => state.read);

  useEffect(() => {
    void useNotificationState.persist.rehydrate();
  }, []);

  return useMemo(() => {
    const seenIds = new Set(seen);
    const readIds = new Set(read);
    const items = deriveNotifications(tasks ?? [], new Date(nowMs)).map((notification) => ({
      ...notification,
      unread: !readIds.has(notification.id),
      unseen: !seenIds.has(notification.id),
    }));
    return { items, unseenCount: items.filter((item) => item.unseen).length };
  }, [tasks, nowMs, seen, read]);
}
