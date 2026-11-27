"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";
import { NAV_ITEMS, isActivePath } from "./nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Views"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line glass pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-fg" : "text-fg-secondary",
                )}
              >
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  transition={springs.press}
                  className="relative grid h-8 w-14 place-items-center"
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      transition={springs.snappy}
                      className="absolute inset-0 rounded-full bg-brand/20 shadow-glow-brand"
                    />
                  )}
                  <Icon className={cn("relative size-5", active && "text-brand-text")} />
                </motion.span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
