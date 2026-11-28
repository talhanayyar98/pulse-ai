"use client";

import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();
const assumeOnline = () => true;

/** Whether the device has a connection, as TanStack Query and the outbox see it. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, assumeOnline);
}
