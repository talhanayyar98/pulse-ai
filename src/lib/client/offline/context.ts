"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { OfflineClient } from "./offline-client";

export const OfflineClientContext = createContext<OfflineClient | null>(null);

export function useOfflineClient(): OfflineClient {
  const client = useContext(OfflineClientContext);
  if (!client) throw new Error("useOfflineClient must be used inside AppProviders");
  return client;
}

/** Starts the offline client; true until the last visit's data is back in the cache. */
export function useOfflineRestore(client: OfflineClient): boolean {
  const [restoring, setRestoring] = useState(true);
  useEffect(() => client.start(() => setRestoring(false)), [client]);
  return restoring;
}
