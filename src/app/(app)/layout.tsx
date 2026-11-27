import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command/CommandPalette";
import { BottomNav } from "@/components/shell/BottomNav";
import { GlobalShortcuts } from "@/components/shell/GlobalShortcuts";
import { MobileTopBar } from "@/components/shell/MobileTopBar";
import { NewTaskFab } from "@/components/shell/QuickActions";
import { SessionGuard } from "@/components/shell/SessionGuard";
import { Sidebar } from "@/components/shell/Sidebar";
import { TaskDrawer } from "@/components/task/TaskDrawer";
import { Toaster } from "@/components/ui/Toaster";

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {/* Overlays mark #app-root inert while open; they and toasts render outside it. */}
      <div id="app-root" className="flex min-h-dvh">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-neon px-3 py-2 font-medium text-on-neon focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main id="main" className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
        <NewTaskFab />
      </div>
      <SessionGuard />
      <GlobalShortcuts />
      <CommandPalette />
      <TaskDrawer />
      <Toaster />
    </>
  );
}
