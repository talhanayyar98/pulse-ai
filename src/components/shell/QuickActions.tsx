"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/Kbd";
import { springs } from "@/lib/motion";
import { useUi } from "@/lib/stores/ui";

/** Sidebar: the gradient "New task" CTA plus a search entry point that teaches ⌘K. */
export function SidebarQuickActions() {
  const openPalette = useUi((state) => state.openPalette);
  return (
    <div className="mb-6 flex flex-col gap-1.5">
      <Button
        variant="primary"
        className="group w-full justify-between"
        onClick={() => openPalette("create")}
      >
        <span className="flex items-center gap-2">
          <PlusIcon className="size-4 transition-transform duration-300 ease-spring group-hover:rotate-90" />
          New task
        </span>
        <Kbd className="border-white/40">N</Kbd>
      </Button>
      <Button
        variant="ghost"
        className="group w-full justify-between"
        onClick={() => openPalette("search")}
      >
        <span className="flex items-center gap-2">
          <SearchIcon className="size-4 transition-transform duration-300 ease-spring group-hover:scale-115 group-hover:-rotate-12" />
          Search
        </span>
        <Kbd className="text-fg-muted">⌘K</Kbd>
      </Button>
    </div>
  );
}

/** Mobile: floating gradient button above the bottom nav, haloed by a slowly turning glow. */
export function NewTaskFab() {
  const openPalette = useUi((state) => state.openPalette);
  return (
    <div className="fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 md:hidden">
      <span
        aria-hidden
        className="absolute -inset-1.5 animate-spin-slow rounded-full bg-[conic-gradient(var(--color-brand),var(--color-accent),var(--color-info),var(--color-brand))] opacity-70 blur-md"
      />
      <motion.button
        type="button"
        aria-label="New task"
        onClick={() => openPalette("create")}
        whileTap={{ scale: 0.88, rotate: 90 }}
        transition={springs.press}
        className="relative grid size-14 place-items-center rounded-full bg-cta text-on-brand shadow-cta"
      >
        <PlusIcon className="size-6" strokeWidth={2.25} />
      </motion.button>
    </div>
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
