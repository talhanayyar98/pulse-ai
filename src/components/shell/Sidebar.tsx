"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";
import { Logo } from "./Logo";
import { NAV_ITEMS, isActivePath } from "./nav";
import { OverdueBadge } from "./OverdueBadge";
import { SidebarQuickActions } from "./QuickActions";
import { UserMenu } from "./UserMenu";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-nav px-3 py-5 text-nav-fg md:flex">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link href="/board" className="rounded-xl px-2 py-1" aria-label="Pulse home">
          <Logo />
        </Link>
        <NotificationBell placement="sidebar" />
      </div>

      <SidebarQuickActions />

      <nav aria-label="Views">
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-nav-fg-muted uppercase">
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
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                    active ? "text-nav-fg" : "text-nav-fg-muted hover:bg-white/6 hover:text-nav-fg",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={springs.snappy}
                      className="absolute inset-0 rounded-xl bg-nav-raised shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                    >
                      <span className="absolute top-2 bottom-2 left-0 w-0.75 rounded-full bg-nav-accent" />
                    </motion.span>
                  )}
                  <motion.span
                    whileTap={{ scale: 0.96 }}
                    transition={springs.press}
                    className="relative flex flex-1 items-center gap-3"
                  >
                    <Icon
                      className={cn(
                        "size-5 transition-[color,translate,rotate] duration-300 ease-spring",
                        active
                          ? "text-nav-accent"
                          : "group-hover:translate-x-0.5 group-hover:-rotate-6 group-hover:text-nav-accent",
                      )}
                    />
                    <span className="transition-[translate] duration-300 ease-spring group-hover:translate-x-0.5">
                      {label}
                    </span>
                    {href === "/board" && <OverdueBadge variant="count" className="ml-auto" />}
                  </motion.span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-nav-line pt-3">
        <UserMenu />
      </div>
    </aside>
  );
}
