"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // The service worker is off in `next dev` so stale caches never hide code changes.
    // reloadOnOnline is off: the offline outbox (M5) replays edits without a page reload.
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SerwistProvider>
  );
}
