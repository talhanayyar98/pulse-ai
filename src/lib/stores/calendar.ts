import { create } from "zustand";
import type { DayKey } from "@/lib/domain/calendar";

/**
 * The day the week planner and month calendar are looking at, shared so switching views
 * keeps your place. Null means "today" (and follows the clock past midnight). Not persisted:
 * a fresh visit starts on today.
 */
interface CalendarState {
  focus: DayKey | null;
  setFocus: (focus: DayKey | null) => void;
}

export const useCalendar = create<CalendarState>()((set) => ({
  focus: null,
  setFocus: (focus) => set({ focus }),
}));
