"use client";

import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BellIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/Segmented";
import type { NotificationView } from "@/lib/client/notifications";
import { cn } from "@/lib/cn";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { useNow } from "@/lib/hooks/use-now";
import { useNotificationState } from "@/lib/stores/notifications";
import { useUi } from "@/lib/stores/ui";
import { NotificationItem } from "./NotificationItem";

/** "sidebar": opens beside the desktop sidebar. "topbar": drops under the mobile top bar. */
export type PanelPlacement = "sidebar" | "topbar";

const PLACEMENT: Record<PanelPlacement, string> = {
  sidebar: "top-3 left-[15.5rem] w-[24rem] max-h-[calc(100dvh-1.5rem)] origin-top-left",
  topbar:
    "inset-x-2 top-[calc(env(safe-area-inset-top)+3.75rem)] max-h-[calc(100dvh-env(safe-area-inset-top)-10rem)] origin-top-right sm:left-auto sm:w-[24rem]",
};

type Filter = "all" | "unread";

interface NotificationPanelProps {
  id: string;
  open: boolean;
  placement: PanelPlacement;
  items: NotificationView[];
  /** Ids that were new when the panel opened. */
  fresh: ReadonlySet<string>;
  /** The bell: clicks on it are not "outside", and focus returns to it on close. */
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

/**
 * A non-modal popover (the page stays usable): closes on Escape, on a click outside, or when
 * focus moves elsewhere. Rendered in <body> so the sidebar's backdrop blur can't clip it.
 * If focus was inside when it closes (Escape, opening a task), it goes back to the bell, which
 * is also where the task drawer returns it afterwards.
 */
export function NotificationPanel(props: NotificationPanelProps) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>{props.open && <PanelBody {...props} />}</AnimatePresence>,
    document.body,
  );
}

function PanelBody({ id, placement, items, fresh, anchorRef, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const now = useNow();
  const openDrawer = useUi((state) => state.openDrawer);
  const { setRead, markAllRead } = useNotificationState.getState();
  const isPresent = useIsPresent();

  useLayoutEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Runs as closing starts, before a task drawer opened in the same click takes focus.
  useLayoutEffect(() => {
    if (isPresent) return;
    const active = document.activeElement;
    if (active instanceof Node && panelRef.current?.contains(active)) anchorRef.current?.focus();
  }, [isPresent, anchorRef]);

  useEffect(() => {
    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      (panelRef.current?.contains(target) === true || anchorRef.current?.contains(target) === true);
    function onPointerDown(event: PointerEvent) {
      if (!isInside(event.target)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onFocusIn(event: FocusEvent) {
      if (!isInside(event.target)) onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [anchorRef, onClose]);

  const unreadCount = items.filter((item) => item.unread).length;
  const shown = filter === "unread" ? items.filter((item) => item.unread) : items;
  const isNew = (item: NotificationView) => item.unseen || fresh.has(item.id);
  const groups = [
    { label: "New", items: shown.filter(isNew) },
    { label: "Earlier", items: shown.filter((item) => !isNew(item)) },
  ].filter((group) => group.items.length > 0);

  function openTask(item: NotificationView) {
    setRead(item.id, true);
    onClose();
    openDrawer(item.task.id);
  }

  return (
    <motion.div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label="Notifications"
      tabIndex={-1}
      // A closing panel is decoration only: hidden from assistive tech and not interactive.
      inert={!isPresent}
      aria-hidden={isPresent ? undefined : true}
      initial={{ opacity: 0, scale: 0.94, y: -8, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.96, y: -6, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 480, damping: 34 }}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-line-strong glass shadow-[0_30px_80px_-20px_rgb(0_0_0/0.85),0_0_60px_-24px_var(--color-brand-glow)] outline-none",
        PLACEMENT[placement],
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-accent/70 to-transparent"
      />
      <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <button
          type="button"
          disabled={unreadCount === 0}
          onClick={() => markAllRead(items.map((item) => item.id))}
          className="rounded-lg px-2 py-1 text-xs font-medium text-info transition-colors hover:bg-info/10 disabled:pointer-events-none disabled:text-fg-muted"
        >
          Mark all as read
        </button>
      </header>
      <div className="px-4 pb-2">
        <Segmented
          label="Show"
          value={filter}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: unreadCount > 0 ? `Unread · ${unreadCount}` : "Unread" },
          ]}
          onChange={setFilter}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 ? (
          <EmptyPanel filter={filter} />
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label} className="pt-2">
              <h3 className="px-2.5 pb-1 font-mono text-[11px] font-normal tracking-[0.14em] text-fg-muted uppercase">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-0.5">
                <AnimatePresence initial={false}>
                  {group.items.map((item, index) => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      index={index}
                      now={now}
                      onOpen={() => openTask(item)}
                      onToggleRead={() => setRead(item.id, item.unread)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))
        )}
      </div>
    </motion.div>
  );
}

function EmptyPanel({ filter }: Readonly<{ filter: Filter }>) {
  return (
    <div className="flex flex-col items-center px-6 pt-8 pb-10 text-center">
      <span className="grid size-14 animate-float place-items-center rounded-2xl bg-linear-135 from-brand/35 to-accent/20 text-brand-text shadow-glow-brand">
        <BellIcon className="size-7" />
      </span>
      <p className="mt-4 font-display font-semibold">
        {filter === "unread" ? "Nothing unread" : "You're all caught up"}
      </p>
      <p className="mt-1 max-w-60 text-xs text-fg-secondary">
        {filter === "unread"
          ? "Every notification has been read."
          : "Overdue, due-soon, stuck and freshly finished tasks show up here."}
      </p>
    </div>
  );
}
