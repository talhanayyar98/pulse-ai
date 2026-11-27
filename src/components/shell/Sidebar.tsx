"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";
import { Logo } from "./Logo";
import { NAV_ITEMS, isActivePath } from "./nav";
import { SidebarQuickActions } from "./QuickActions";
import { UserMenu } from "./UserMenu";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line glass px-3 py-5 md:flex">
      <Link href="/board" className="mb-6 rounded-xl px-2 py-1" aria-label="Pulse home">
        <Logo />
      </Link>

      <SidebarQuickActions />

      <nav aria-label="Views">
        <p className="mb-2 px-3 font-mono text-[11px] tracking-[0.18em] text-fg-muted uppercase">
          Views
        </p>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "text-fg" : "text-fg-secondary hover:bg-white/4 hover:text-fg",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={springs.snappy}
                      className="absolute inset-0 rounded-xl bg-brand/15 shadow-glow-brand"
                    />
                  )}
                  <motion.span
                    whileTap={{ scale: 0.96 }}
                    transition={springs.press}
                    className="relative flex items-center gap-3"
                  >
                    <Icon
                      className={cn(
                        "size-5 transition-colors",
                        active ? "text-brand-text" : "group-hover:text-brand-text",
                      )}
                    />
                    {label}
                  </motion.span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-line pt-3">
        <UserMenu />
      </div>
    </aside>
  );
}
