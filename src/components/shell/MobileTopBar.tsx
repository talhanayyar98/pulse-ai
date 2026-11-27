import Link from "next/link";
import { Logo } from "./Logo";
import { MobileSearchButton } from "./QuickActions";
import { UserMenu } from "./UserMenu";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line glass px-4 pt-[env(safe-area-inset-top)] md:hidden">
      <Link href="/board" aria-label="Pulse home" className="rounded-lg py-3">
        <Logo />
      </Link>
      <div className="flex items-center gap-1">
        <MobileSearchButton />
        <UserMenu compact />
      </div>
    </header>
  );
}
