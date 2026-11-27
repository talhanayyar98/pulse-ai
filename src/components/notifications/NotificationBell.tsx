"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useId, useRef, useState } from "react";
import { BellIcon } from "@/components/ui/icons";
import { useNotifications } from "@/lib/client/notifications";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";
import { useNotificationState } from "@/lib/stores/notifications";
import { NotificationPanel, type PanelPlacement } from "./NotificationPanel";

/**
 * Bell with a red count of notifications that arrived since the panel was last opened.
 * Opening the panel clears the count (they're "seen"); items stay highlighted until read.
 */
export function NotificationBell({ placement }: Readonly<{ placement: PanelPlacement }>) {
  const { items, unseenCount } = useNotifications();
  const [open, setOpen] = useState(false);
  // What was new when the panel opened: listed under "New" until it closes.
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setFresh(new Set(items.filter((item) => item.unseen).map((item) => item.id)));
    useNotificationState.getState().markAllSeen(items.map((item) => item.id));
    setOpen(true);
  }

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        aria-label={unseenCount > 0 ? `Notifications, ${unseenCount} new` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        className={cn(
          "relative grid size-9 place-items-center rounded-xl transition-[color,background-color,box-shadow,scale] duration-200 active:scale-90",
          open
            ? "bg-brand/20 text-fg shadow-glow-brand"
            : "text-fg-secondary hover:bg-white/6 hover:text-fg",
        )}
      >
        {/* Re-keyed on every change so the bell rings when something new arrives. */}
        <motion.span
          key={unseenCount}
          className="origin-top"
          animate={unseenCount > 0 ? { rotate: [0, -18, 15, -10, 6, -2, 0] } : undefined}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        >
          <BellIcon className="size-5" />
        </motion.span>
        <AnimatePresence>
          {unseenCount > 0 && (
            <motion.span
              aria-hidden
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={springs.snappy}
              className="absolute -top-1 -right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-danger-strong px-1 font-mono text-[10px] leading-none font-semibold text-on-brand shadow-[0_0_12px_-2px_var(--color-danger-glow)] ring-2 ring-canvas"
            >
              {unseenCount > 9 ? "9+" : unseenCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <NotificationPanel
        id={panelId}
        open={open}
        placement={placement}
        items={items}
        fresh={fresh}
        anchorRef={bellRef}
        onClose={close}
      />
    </>
  );
}
