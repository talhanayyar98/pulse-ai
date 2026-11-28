"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { IsRestoringProvider, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { type ReactNode, useState } from "react";
import { ApiError } from "@/lib/client/api";
import { OfflineClientContext, useOfflineRestore } from "@/lib/client/offline/context";
import { createOfflineClient } from "@/lib/client/offline/offline-client";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retrying a 4xx (signed out, not found) can't help; retry network and server errors.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
  });
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(createQueryClient);
  // Creating it touches nothing; IndexedDB opens when it starts, in the browser.
  const [offlineClient] = useState(() => createOfflineClient(queryClient));
  // Queries wait (showing their loading state) until the saved data is back in the cache, so
  // a page opened offline shows the last-synced tasks rather than failing to fetch them.
  const restoring = useOfflineRestore(offlineClient);

  return (
    // The service worker is off in `next dev` so stale caches never hide code changes.
    // reloadOnOnline is off: the outbox replays edits without a page reload.
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      <QueryClientProvider client={queryClient}>
        <IsRestoringProvider value={restoring}>
          <OfflineClientContext value={offlineClient}>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
          </OfflineClientContext>
        </IsRestoringProvider>
      </QueryClientProvider>
    </SerwistProvider>
  );
}
