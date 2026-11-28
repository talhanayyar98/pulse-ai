import type { PointerEvent } from "react";

/** Moves a `spotlight` element's wash to the pointer (see the utility in globals.css). */
export function trackSpotlight(event: PointerEvent<HTMLElement>): void {
  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
  element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
}
