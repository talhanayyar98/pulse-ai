"use client";

import { useEffect } from "react";
import { useUi } from "@/lib/stores/ui";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** ⌘K / Ctrl+K toggles the command palette anywhere; N opens quick add when not typing. */
export function GlobalShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const ui = useUi.getState();

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (ui.palette) ui.closePalette();
        else ui.openPalette("search");
        return;
      }

      const modified = event.metaKey || event.ctrlKey || event.altKey;
      if (event.defaultPrevented || event.repeat || modified || isTyping(event.target)) return;

      if (event.key.toLowerCase() === "n" && !ui.palette) {
        event.preventDefault();
        ui.openPalette("create");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
