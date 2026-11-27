import { create } from "zustand";

export type PaletteMode = "search" | "create";

interface UiState {
  /** Task shown in the side drawer, if any. */
  drawerTaskId: string | null;
  /**
   * Increments on every open. Overlays are keyed by it, so reopening during a close animation
   * mounts a fresh panel instead of reviving the closing one (whose exit could then stall).
   */
  drawerSession: number;
  /** Command palette mode, or null when closed. */
  palette: PaletteMode | null;
  /** As drawerSession; also guarantees each opening starts with an empty input. */
  paletteSession: number;
  openDrawer: (taskId: string) => void;
  closeDrawer: () => void;
  openPalette: (mode: PaletteMode) => void;
  closePalette: () => void;
}

export const useUi = create<UiState>()((set) => ({
  drawerTaskId: null,
  drawerSession: 0,
  palette: null,
  paletteSession: 0,
  openDrawer: (taskId) =>
    set((state) => ({ drawerTaskId: taskId, drawerSession: state.drawerSession + 1 })),
  closeDrawer: () => set({ drawerTaskId: null }),
  openPalette: (mode) =>
    set((state) => ({ palette: mode, paletteSession: state.paletteSession + 1 })),
  closePalette: () => set({ palette: null }),
}));
