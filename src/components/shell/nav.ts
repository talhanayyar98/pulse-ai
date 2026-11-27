import type { ComponentType, SVGProps } from "react";
import { BoardIcon, MonthIcon, WeekIcon } from "@/components/ui/icons";
import { APP_VIEWS, type AppViewHref } from "@/lib/routes";

const VIEW_ICONS: Record<AppViewHref, ComponentType<SVGProps<SVGSVGElement>>> = {
  "/board": BoardIcon,
  "/week": WeekIcon,
  "/month": MonthIcon,
};

export const NAV_ITEMS = APP_VIEWS.map((view) => ({ ...view, Icon: VIEW_ICONS[view.href] }));

export function isActivePath(pathname: string, href: AppViewHref): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
