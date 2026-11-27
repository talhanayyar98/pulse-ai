"use client";

import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { SignOutIcon } from "@/components/ui/icons";
import { signOutUser } from "@/lib/auth-actions";
import { cn } from "@/lib/cn";
import { usePendingTasks } from "@/lib/client/pending";
import { useSession } from "@/lib/client/session";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ compact = false }: Readonly<{ compact?: boolean }>) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  if (!session) return null;

  const name = session.user.name ?? session.user.email ?? "You";

  return (
    <div className={cn("flex items-center gap-3", !compact && "rounded-xl px-2 py-2")}>
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt=""
          width={32}
          height={32}
          unoptimized
          referrerPolicy="no-referrer"
          className="size-8 rounded-full border border-line-strong"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-brand-deep text-xs font-semibold text-on-brand"
        >
          {initials(name)}
        </span>
      )}
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {session.user.email && (
            <p className="truncate text-xs text-fg-muted">{session.user.email}</p>
          )}
        </div>
      )}
      <form
        action={async () => {
          // Drop this user's cached data before the next person signs in on this device.
          queryClient.clear();
          usePendingTasks.getState().clear();
          await signOutUser();
        }}
      >
        <button
          type="submit"
          aria-label="Sign out"
          title="Sign out"
          className="grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <SignOutIcon className="size-4" />
        </button>
      </form>
    </div>
  );
}
