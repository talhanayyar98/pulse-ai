"use client";

import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_SETTINGS, type Settings, type WeekStartsOn } from "@/lib/domain/settings";
import { useToasts } from "@/lib/stores/toasts";
import { api } from "./api";
import { settingsKey } from "./query-keys";
import { useSession } from "./session";

export function useSettingsQuery() {
  const session = useSession();
  return useQuery({
    queryKey: settingsKey,
    queryFn: api.getSettings,
    enabled: Boolean(session.data),
    staleTime: 5 * 60_000,
  });
}

/** The user's settings; the defaults until they load (or when signed out). */
export function useSettings(): Settings {
  return useSettingsQuery().data ?? DEFAULT_SETTINGS;
}

export function useWeekStartsOn(): WeekStartsOn {
  return useSettings().weekStartsOn;
}

/** For code outside React rendering (event handlers that read the latest value). */
export function cachedSettings(queryClient: QueryClient): Settings {
  return queryClient.getQueryData<Settings>(settingsKey) ?? DEFAULT_SETTINGS;
}

/** Saves settings optimistically; a failed save puts the previous ones back. */
export function useSaveSettings(): (settings: Settings) => void {
  const queryClient = useQueryClient();
  const pushToast = useToasts((state) => state.push);
  const { mutate } = useMutation({
    mutationFn: api.putSettings,
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: settingsKey });
      const previous = queryClient.getQueryData<Settings>(settingsKey);
      queryClient.setQueryData(settingsKey, settings);
      return { previous };
    },
    onSuccess: (settings) => queryClient.setQueryData(settingsKey, settings),
    onError: (_error, _settings, context) => {
      queryClient.setQueryData(settingsKey, context?.previous);
      pushToast({ title: "Couldn't save your settings", description: "Please try again." });
    },
  });
  return mutate;
}
