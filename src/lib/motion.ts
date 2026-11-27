import type { Transition } from "motion/react";

/** Shared spring presets so every micro-interaction feels like the same app. */
export const springs = {
  /** Indicators and small UI that should snap into place. */
  snappy: { type: "spring", stiffness: 520, damping: 38, mass: 0.7 },
  /** Press feedback on buttons and links. */
  press: { type: "spring", stiffness: 700, damping: 30 },
} as const satisfies Record<string, Transition>;
