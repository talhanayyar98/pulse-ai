"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

function subscribe(onChange: () => void): () => void {
  const timer = setInterval(onChange, MINUTE / 4);
  return () => clearInterval(timer);
}

/** Current time rounded to the minute; re-renders when the minute changes. */
function minuteNow(): number {
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

export function useNow(): Date {
  return new Date(useSyncExternalStore(subscribe, minuteNow, minuteNow));
}
