"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSentNotifications } from "@/lib/client/notifications";
import { notificationsKey } from "@/lib/client/query-keys";
import type { ServiceWorkerNotice } from "@/lib/domain/push";
import { useToasts } from "@/lib/stores/toasts";
import { useUi } from "@/lib/stores/ui";

/** A reminder older than this when the app first hears of it is history, not news. */
const FRESH_MS = 2 * 60_000;

function isNotice(data: unknown): data is ServiceWorkerNotice {
  return typeof data === "object" && data !== null && "type" in data;
}

/**
 * While Pulse is open: a toast for each reminder as it arrives (from a push, or the regular
 * check that also covers devices without notifications), and a notification clicked while a
 * window is open opens its task there. Renders nothing.
 */
export function ReminderNotices() {
  const { data: sent } = useSentNotifications();
  const queryClient = useQueryClient();
  const openDrawer = useUi((ui) => ui.openDrawer);
  const pushToast = useToasts((store) => store.push);
  /** Ids already shown or already there when the page loaded. */
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function onMessage(event: MessageEvent) {
      if (!isNotice(event.data)) return;
      if (event.data.type === "pulse:notification") {
        void queryClient.invalidateQueries({ queryKey: notificationsKey });
      } else if (event.data.type === "pulse:open-task") {
        openDrawer(event.data.taskId);
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient, openDrawer]);

  useEffect(() => {
    if (!sent) return;
    if (known.current === null) {
      known.current = new Set(sent.map((notification) => notification.id));
      return;
    }
    const seen = known.current;
    const now = Date.now();
    for (const notification of [...sent].reverse()) {
      if (seen.has(notification.id)) continue;
      seen.add(notification.id);
      if (now - Date.parse(notification.createdAt) > FRESH_MS) continue;
      pushToast({
        title: `Reminder: ${notification.title}`,
        description: notification.body,
        action: { label: "Open", onClick: () => openDrawer(notification.taskId) },
      });
    }
  }, [sent, pushToast, openDrawer]);

  return null;
}
