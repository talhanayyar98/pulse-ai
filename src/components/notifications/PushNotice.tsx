"use client";

import { type PushState, usePush } from "@/lib/client/push";
import { useOnline } from "@/lib/hooks/use-online";

/** Why a device can't get reminders while Pulse is closed (null: it can, or can be made to). */
const BLOCKED_REASON: Record<PushState, string | null> = {
  checking: null,
  on: null,
  off: null,
  prompt: null,
  denied: "Notifications are blocked for Pulse in this browser's settings",
  unsupported: "This browser can't show notifications from Pulse",
  unconfigured: "This server doesn't send notifications",
};

/**
 * One line on whether reminders reach this device while Pulse is closed, with the way to turn
 * them on where there is one. Says nothing once they're on.
 */
export function PushNotice() {
  const state = usePush((store) => store.state);
  const busy = usePush((store) => store.busy);
  const enable = usePush((store) => store.enable);
  const online = useOnline();

  if (state === "prompt" || state === "off") {
    return (
      <p className="text-xs text-fg-secondary">
        Reminders show here only while Pulse is open.{" "}
        <button
          type="button"
          disabled={busy || !online}
          title={online ? undefined : "Turning on notifications needs a connection"}
          onClick={() => void enable()}
          className="font-semibold text-info underline-offset-2 hover:underline disabled:text-fg-muted disabled:no-underline"
        >
          Turn on notifications
        </button>
      </p>
    );
  }
  const reason = BLOCKED_REASON[state];
  if (!reason) return null;
  return (
    <p className="text-xs text-fg-muted">{reason}, so reminders show only while Pulse is open.</p>
  );
}
