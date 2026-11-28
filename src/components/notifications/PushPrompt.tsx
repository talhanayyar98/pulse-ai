"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { BellIcon } from "@/components/ui/icons";
import { usePendingTasks } from "@/lib/client/pending";
import { usePush } from "@/lib/client/push";
import { useReminderPolicy } from "@/lib/client/reminders";
import { scheduledReminders } from "@/lib/domain/reminders";
import { springs } from "@/lib/motion";
import { useUi } from "@/lib/stores/ui";

/**
 * Offers notifications at the moment they make sense: right after an edit on this device gives
 * a task a reminder still to come (never on first load). Hidden while a dialog or the drawer is
 * open (the drawer has its own line) and once answered. "Not now" is remembered on this device;
 * Settings can still turn notifications on.
 */
export function PushPrompt() {
  const state = usePush((store) => store.state);
  const offered = usePush((store) => store.offered);
  const dismissed = usePush((store) => store.promptDismissed);
  const busy = usePush((store) => store.busy);
  const overlayOpen = useUi(
    (ui) => ui.drawerTaskId !== null || ui.palette !== null || ui.settingsOpen,
  );
  const policy = useReminderPolicy();

  useEffect(
    () =>
      usePendingTasks.subscribe((pending, previous) => {
        const now = Date.now();
        const gainsReminder = Object.values(pending.byId).some(
          (task) =>
            previous.byId[task.id] !== task &&
            scheduledReminders(task, policy).some(({ fireAt }) => fireAt.getTime() > now),
        );
        if (gainsReminder) usePush.getState().offer();
      }),
    [policy],
  );

  const visible = offered && !dismissed && state === "prompt" && !overlayOpen;

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          aria-label="Turn on notifications"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } }}
          transition={springs.snappy}
          className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-40 flex gap-3 rounded-2xl border border-line bg-surface p-4 shadow-lift md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:w-88"
        >
          <span
            aria-hidden
            className="grid size-10 shrink-0 animate-float place-items-center rounded-full bg-brand/10 text-brand-text ring-1 ring-brand/25"
          >
            <BellIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Get reminders even when Pulse is closed</p>
            <p className="mt-0.5 text-xs text-fg-secondary">
              Pulse can notify this device before your tasks are due.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => void usePush.getState().enable()}
              >
                Turn on notifications
              </Button>
              <Button variant="ghost" size="sm" onClick={usePush.getState().dismissPrompt}>
                Not now
              </Button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
