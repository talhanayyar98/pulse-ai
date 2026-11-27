import type { ReactNode } from "react";
import { BottomNav } from "@/components/shell/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-neon px-3 py-2 font-medium text-on-neon focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main" className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
