"use client";

import Image from "next/image";
import { SettingsIcon, SignOutIcon } from "@/components/ui/icons";
import { signOutUser } from "@/lib/auth-actions";
import { cn } from "@/lib/cn";
import { useOfflineClient } from "@/lib/client/offline/context";
import { usePush } from "@/lib/client/push";
import { useSession } from "@/lib/client/session";
import { useOnline } from "@/lib/hooks/use-online";
import { useNotificationState } from "@/lib/stores/notifications";
import { useToasts } from "@/lib/stores/toasts";
import { useUi } from "@/lib/stores/ui";

const NAV_ICON_BUTTON =
  "group grid size-8 place-items-center rounded-lg text-nav-fg-muted transition-colors enabled:hover:bg-white/8 enabled:hover:text-nav-fg disabled:opacity-50";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ compact = false }: Readonly<{ compact?: boolean }>) {
  const { data: session } = useSession();
  const offlineClient = useOfflineClient();
  const online = useOnline();
  const openSettings = useUi((state) => state.openSettings);
  const pushToast = useToasts((state) => state.push);
  if (!session) return null;

  async function signOut() {
    // Unsynced edits would be lost with this device's data; never drop them silently.
    if (!(await offlineClient.prepareSignOut())) {
      pushToast({
        title: "Still signed in",
        description: "Some edits haven't synced yet. Try again in a moment.",
      });
      return;
    }
    useNotificationState.getState().clear();
    // This device must stop receiving the user's reminders once they've signed out.
    await usePush
      .getState()
      .disable()
      .catch(() => undefined);
    try {
      await signOutUser();
    } catch {
      // Reloading below still works: the sign-in page sends a signed-in user back to the board.
    }
    // A full load, so nothing of this user's stays in memory for the next one.
    window.location.replace("/signin");
  }

  const name = session.user.name ?? session.user.email ?? "You";

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        !compact && "rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-white/5",
      )}
    >
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt=""
          width={32}
          height={32}
          unoptimized
          referrerPolicy="no-referrer"
          className="size-8 rounded-full ring-2 ring-white/20 ring-offset-2 ring-offset-nav"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-cta text-xs font-semibold text-on-brand ring-2 ring-white/20 ring-offset-2 ring-offset-nav"
        >
          {initials(name)}
        </span>
      )}
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {session.user.email && (
            <p className="truncate text-xs text-nav-fg-muted">{session.user.email}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={openSettings}
          className={NAV_ICON_BUTTON}
        >
          <SettingsIcon className="size-4 transition-transform duration-300 ease-spring group-hover:rotate-12" />
        </button>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            title={online ? "Sign out" : "Signing out needs a connection"}
            disabled={!online}
            className={NAV_ICON_BUTTON}
          >
            <SignOutIcon className="size-4 transition-transform duration-300 ease-spring group-hover:translate-x-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
