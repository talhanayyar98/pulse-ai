"use client";

import { useEffect, useRef } from "react";
import { deviceTimeZone } from "@/lib/client/reminders";
import { useSaveSettings, useSettingsQuery } from "@/lib/client/settings";
import { useOnline } from "@/lib/hooks/use-online";

/**
 * Saves this device's time zone for a user who has none yet, so the server works out
 * reminder times in it. Once per page, from freshly fetched settings. Renders nothing.
 */
export function TimeZoneSync() {
  const { data: settings, isFetchedAfterMount } = useSettingsQuery();
  const save = useSaveSettings();
  const online = useOnline();
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current || !online || !isFetchedAfterMount || settings?.timeZone !== null) return;
    tried.current = true;
    save({ ...settings, timeZone: deviceTimeZone() });
  }, [online, isFetchedAfterMount, settings, save]);

  return null;
}
