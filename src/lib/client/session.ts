"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { sessionKey } from "./query-keys";

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: api.session, staleTime: 5 * 60_000 });
}
