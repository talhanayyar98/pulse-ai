"use client";

import { useMemo } from "react";
import type { ReminderPolicy } from "@/lib/domain/reminders";
import { reminderPolicy } from "@/lib/domain/settings";
import { useSettings } from "./settings";

/** This device's IANA time zone, e.g. "Europe/London". */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The reminder policy the server applies, so the device shows the same reminder times. */
export function useReminderPolicy(): ReminderPolicy {
  const settings = useSettings();
  return useMemo(() => reminderPolicy(settings, deviceTimeZone()), [settings]);
}
