import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type BoardFilters, type HorizonFilter, NO_FILTERS } from "@/lib/domain/filters";
import type { Priority } from "@/lib/domain/task";

interface BoardFiltersState {
  filters: BoardFilters;
  setHorizon: (horizon: HorizonFilter) => void;
  togglePriority: (priority: Priority) => void;
  toggleLabel: (label: string) => void;
  clear: () => void;
}

function toggle<T>(values: readonly T[], value: T, same: (a: T, b: T) => boolean = Object.is): T[] {
  return values.some((existing) => same(existing, value))
    ? values.filter((existing) => !same(existing, value))
    : [...values, value];
}

const sameLabel = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Board filters, remembered on this device. `skipHydration` because the board page is
 * statically rendered with defaults; BoardView rehydrates after mount, avoiding a mismatch.
 */
export const useBoardFilters = create<BoardFiltersState>()(
  persist(
    (set) => ({
      filters: NO_FILTERS,
      setHorizon: (horizon) => set((state) => ({ filters: { ...state.filters, horizon } })),
      togglePriority: (priority) =>
        set((state) => ({
          filters: { ...state.filters, priorities: toggle(state.filters.priorities, priority) },
        })),
      toggleLabel: (label) =>
        set((state) => ({
          filters: { ...state.filters, labels: toggle(state.filters.labels, label, sameLabel) },
        })),
      clear: () => set({ filters: NO_FILTERS }),
    }),
    {
      name: "pulse:board-filters",
      version: 1,
      skipHydration: true,
      partialize: (state) => ({ filters: state.filters }),
    },
  ),
);
