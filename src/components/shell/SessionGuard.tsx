"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { sessionKey } from "@/lib/client/query-keys";
import { useSession } from "@/lib/client/session";

/**
 * View pages are static shells (so they work offline); the session is checked here instead.
 * Only a confirmed "signed out" answer redirects. A network failure does not, so the app
 * keeps working offline.
 */
export function SessionGuard() {
  const { data: session, isSuccess } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!isSuccess || session) return;
    // Forget the "signed out" answer so it is re-checked after signing in.
    queryClient.removeQueries({ queryKey: sessionKey });
    router.replace("/signin");
  }, [isSuccess, session, queryClient, router]);

  return null;
}
