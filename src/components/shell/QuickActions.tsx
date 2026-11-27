"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/Kbd";
import { springs } from "@/lib/motion";
import { useUi } from "@/lib/stores/ui";

/** Sidebar: the neon "New task" CTA plus a search entry point that teaches ⌘K. */
export function SidebarQuickActions() {
  const openPalette = useUi((state) => state.openPalette);
  return (
    <div className="mb-6 flex flex-col gap-1.5">
      <Button
        variant="primary"
        className="w-full justify-between"
        onClick={() => openPalette("create")}
      >
        <span className="flex items-center gap-2">
          <PlusIcon className="size-4" />
          New task
        </span>
        <Kbd>N</Kbd>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-between"
        onClick={() => openPalette("search")}
      >
        <span className="flex items-center gap-2">
          <SearchIcon className="size-4" />
          Search
        </span>
        <Kbd className="text-fg-muted">⌘K</Kbd>
      </Button>
    </div>
  );
}

/** Mobile: floating neon button above the bottom nav. */
export function NewTaskFab() {
  const openPalette = useUi((state) => state.openPalette);
  return (
    <motion.button
      type="button"
      aria-label="New task"
      onClick={() => openPalette("create")}
      whileTap={{ scale: 0.9 }}
      transition={springs.press}
      className="fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-neon text-on-neon shadow-glow-neon md:hidden"
    >
      <PlusIcon className="size-6" strokeWidth={2.25} />
    </motion.button>
  );
}

export function MobileSearchButton() {
  const openPalette = useUi((state) => state.openPalette);
  return (
    <Button variant="ghost" size="icon" aria-label="Search" onClick={() => openPalette("search")}>
      <SearchIcon className="size-5" />
    </Button>
  );
}
