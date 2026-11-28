import { create } from "zustand";
import type { DayKey } from "@/lib/domain/calendar";

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
  /** The day a task created from the palette will be due (quick add on a calendar day). */
  paletteDueOn: DayKey | null;
  /** As drawerSession; also guarantees each opening starts with an empty input. */
  paletteSession: number;
  settingsOpen: boolean;
  /** As drawerSession, for the settings dialog. */
  settingsSession: number;
  openDrawer: (taskId: string) => void;
  closeDrawer: () => void;
  openPalette: (mode: PaletteMode, options?: { dueOn?: DayKey }) => void;
  closePalette: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useUi = create<UiState>()((set) => ({
  drawerTaskId: null,
  drawerSession: 0,
  palette: null,
  paletteDueOn: null,
  paletteSession: 0,
  settingsOpen: false,
  settingsSession: 0,
  openDrawer: (taskId) =>
    set((state) => ({ drawerTaskId: taskId, drawerSession: state.drawerSession + 1 })),
  closeDrawer: () => set({ drawerTaskId: null }),
  openPalette: (mode, options) =>
    set((state) => ({
      palette: mode,
      paletteDueOn: options?.dueOn ?? null,
      paletteSession: state.paletteSession + 1,
    })),
  closePalette: () => set({ palette: null }),
  openSettings: () =>
    set((state) => ({ settingsOpen: true, settingsSession: state.settingsSession + 1 })),
  closeSettings: () => set({ settingsOpen: false }),
}));
