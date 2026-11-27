"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const sessionKey = ["session"] as const;

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: api.session, staleTime: 5 * 60_000 });
}
