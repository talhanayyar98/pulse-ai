import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Which notifications this device has seen and read, Facebook-style:
 * - seen: the panel was opened while it existed, so it no longer counts on the bell;
 * - read: it was opened (or marked as read), so it is no longer highlighted.
 * Ids that no longer match a live notification are dropped, so storage stays small.
 */
interface NotificationReadState {
  seen: readonly string[];
  read: readonly string[];
  /** Marks every current notification as seen and forgets ids that no longer exist. */
  markAllSeen: (currentIds: readonly string[]) => void;
  setRead: (id: string, read: boolean) => void;
  markAllRead: (currentIds: readonly string[]) => void;
  clear: () => void;
}

/**
 * `skipHydration` because the app shell is statically rendered; useNotifications rehydrates
 * after mount, avoiding a mismatch.
 */
export const useNotificationState = create<NotificationReadState>()(
  persist(
    (set) => ({
      seen: [],
      read: [],
      markAllSeen: (currentIds) =>
        set((state) => ({
          seen: [...currentIds],
          read: state.read.filter((id) => currentIds.includes(id)),
        })),
      setRead: (id, read) =>
        set((state) => ({
          read: read ? [...new Set([...state.read, id])] : state.read.filter((r) => r !== id),
          seen: state.seen.includes(id) ? state.seen : [...state.seen, id],
        })),
      markAllRead: (currentIds) => set({ seen: [...currentIds], read: [...currentIds] }),
      clear: () => set({ seen: [], read: [] }),
    }),
    {
      name: "pulse:notifications",
      version: 1,
      skipHydration: true,
      partialize: (state) => ({ seen: state.seen, read: state.read }),
    },
  ),
);
