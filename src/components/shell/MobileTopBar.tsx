import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Logo } from "./Logo";
import { MobileSearchButton } from "./QuickActions";
import { SyncStatusBadge } from "./SyncStatus";
import { UserMenu } from "./UserMenu";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-nav px-4 pt-[env(safe-area-inset-top)] text-nav-fg md:hidden">
      <Link href="/board" aria-label="Pulse home" className="rounded-lg py-3">
        <Logo />
      </Link>
      <div className="flex items-center gap-1">
        <SyncStatusBadge />
        <MobileSearchButton />
        <NotificationBell placement="topbar" />
        <UserMenu compact />
      </div>
    </header>
  );
}
