"use client";

import { AnimatePresence, motion, useIsPresent, type HTMLMotionProps } from "motion/react";
import { type KeyboardEvent, type ReactNode, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useIsClient } from "@/lib/hooks/use-is-client";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Background (#app-root) is inert while any overlay is open; counted so overlays can stack. */
let openOverlays = 0;
function setBackgroundInert(open: boolean) {
  openOverlays += open ? 1 : -1;
  document.getElementById("app-root")?.toggleAttribute("inert", openOverlays > 0);
}

const PANEL_MOTION: Record<"dialog" | "drawer", HTMLMotionProps<"div">> = {
  dialog: {
    initial: { opacity: 0, y: -10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -6, scale: 0.98 },
    transition: { type: "spring", stiffness: 520, damping: 36 },
  },
  drawer: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { type: "spring", stiffness: 380, damping: 40 },
  },
};

const PANEL_CLASS: Record<"dialog" | "drawer", string> = {
  dialog:
    "relative mx-4 mt-[12vh] w-full max-w-xl rounded-2xl border border-line-strong shadow-lift",
  drawer:
    "absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-line-strong shadow-lift",
};

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  variant: "dialog" | "drawer";
  /** Change it to mount a fresh panel (e.g. each time the palette opens), even mid-exit. */
  contentKey?: string | number;
  /**
   * "first": focus `[data-autofocus]` or the first control (dialogs you type into).
   * "panel": focus the panel itself, so opening doesn't light up a control's focus ring.
   */
  initialFocus?: "first" | "panel";
  children: ReactNode;
}

export function Overlay({
  open,
  onClose,
  label,
  variant,
  contentKey = "panel",
  initialFocus = "first",
  children,
}: OverlayProps) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <OverlayPanel
          key={contentKey}
          onClose={onClose}
          label={label}
          variant={variant}
          initialFocus={initialFocus}
        >
          {children}
        </OverlayPanel>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function OverlayPanel({
  onClose,
  label,
  variant,
  initialFocus,
  children,
}: Omit<OverlayProps, "open" | "contentKey">) {
  const panelRef = useRef<HTMLDivElement>(null);
  const release = useRef<(() => void) | null>(null);
  const isPresent = useIsPresent();

  // Layout effect: focus moves before the browser handles the next keystroke, so typing
  // straight after pressing N or ⌘K lands in the input instead of being lost.
  useLayoutEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    setBackgroundInert(true);
    const initial =
      initialFocus === "panel"
        ? panel
        : (panel?.querySelector<HTMLElement>("[data-autofocus]") ??
          panel?.querySelector<HTMLElement>(FOCUSABLE) ??
          panel);
    initial?.focus();

    let released = false;
    release.current = () => {
      if (released) return;
      released = true;
      setBackgroundInert(false);
      const active = document.activeElement;
      const focusIsInside = active instanceof HTMLElement && panel?.contains(active);
      // Blur explicitly: "restoring" focus to <body> is a no-op, which would leave the
      // closing panel's input focused and swallowing keystrokes during its exit animation.
      if (focusIsInside) active.blur();
      // Don't steal focus from an overlay that opened in the meantime.
      const focusIsFree = focusIsInside || !active || active === document.body;
      if (focusIsFree && previouslyFocused?.isConnected && previouslyFocused !== document.body) {
        previouslyFocused.focus();
      }
    };
    return () => release.current?.();
  }, [initialFocus]);

  // Hand focus and the page back as soon as closing starts, not after the exit animation.
  useLayoutEffect(() => {
    if (!isPresent) release.current?.();
  }, [isPresent]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        variant === "dialog" && "flex items-start justify-center",
        !isPresent && "pointer-events-none",
      )}
      onKeyDown={onKeyDown}
      // A closing panel is decoration only: hidden from assistive tech and not interactive.
      inert={!isPresent}
      aria-hidden={isPresent ? undefined : true}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-canvas/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn("glass outline-none", PANEL_CLASS[variant])}
        {...PANEL_MOTION[variant]}
      >
        {children}
      </motion.div>
    </div>
  );
}
