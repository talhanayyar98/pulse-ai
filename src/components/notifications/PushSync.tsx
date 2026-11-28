"use client";

import { useEffect } from "react";
import { usePush } from "@/lib/client/push";
import { useSession } from "@/lib/client/session";

/**
 * Keeps this device's notification state current: on sign-in it registers an existing
 * subscription with the server again, and it follows permission changes made in the browser's
 * settings. Renders nothing.
 */
export function PushSync() {
  const signedIn = Boolean(useSession().data);

  useEffect(() => {
    void usePush.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void usePush.getState().refresh({ sync: true });

    let permission: PermissionStatus | undefined;
    const onChange = () => void usePush.getState().refresh();
    navigator.permissions
      ?.query({ name: "notifications" })
      .then((status) => {
        permission = status;
        status.addEventListener("change", onChange);
      })
      .catch(() => undefined);
    return () => permission?.removeEventListener("change", onChange);
  }, [signedIn]);

  return null;
}
