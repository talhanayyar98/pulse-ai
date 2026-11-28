"use client";

import type { ComponentType } from "react";
import { AlertIcon, CloudCheckIcon, CloudOffIcon, CloudUpIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { type SyncState, useSyncStatus } from "@/lib/client/sync-status";

export function taskCount(count: number): string {
  return count === 1 ? "1 task" : `${count} tasks`;
}

interface Copy {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  detail?: string;
  /** Needs the user's attention: drawn in the brass accent. */
  alert: boolean;
}

function copyFor(state: Exclude<SyncState, "restoring">, pendingCount: number): Copy {
  switch (state) {
    case "synced":
      return { Icon: CloudCheckIcon, title: "All changes synced", alert: false };
    case "syncing":
      return { Icon: CloudUpIcon, title: `Syncing ${taskCount(pendingCount)}…`, alert: false };
    case "offline":
      return {
        Icon: CloudOffIcon,
        title: "Offline",
        detail:
          pendingCount > 0 ? `${taskCount(pendingCount)} to sync` : "Edits are kept on this device",
        alert: true,
      };
    case "retrying":
      return {
        Icon: AlertIcon,
        title: "Can't reach Pulse",
        detail: `${taskCount(pendingCount)} waiting`,
        alert: true,
      };
    case "signed-out":
      return {
        Icon: AlertIcon,
        title: "Signed out",
        detail: `Sign in to sync ${taskCount(pendingCount)}`,
        alert: true,
      };
  }
}

/** The sidebar's sync line: always there, so "All changes synced" is something you can check. */
export function SyncStatus() {
  const { state, pendingCount, retry } = useSyncStatus();
  if (state === "restoring") return <div className="mb-2 h-11" />;
  const { Icon, title, detail, alert } = copyFor(state, pendingCount);

  return (
    <div
      role="group"
      aria-label="Sync status"
      className={cn(
        "mb-2 flex h-11 items-center gap-2.5 rounded-xl px-3 text-xs",
        alert ? "bg-white/5 text-nav-accent" : "text-nav-fg-muted",
      )}
    >
      <Icon className={cn("size-4.5 shrink-0", state === "syncing" && "animate-pulse")} />
      {/* Syncing ↔ synced flips on every edit: only trouble gets an entrance. */}
      <div key={alert ? state : "calm"} className="min-w-0 flex-1 animate-fade-up leading-tight">
        <p className="truncate font-medium">{title}</p>
        {detail && <p className="truncate text-nav-fg-muted">{detail}</p>}
      </div>
      {state === "retrying" && (
        <button
          type="button"
          onClick={retry}
          className="rounded-md px-1.5 py-0.5 font-medium text-nav-fg underline-offset-2 transition-colors hover:bg-white/8 hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/** The mobile top bar's version: an icon that only appears when syncing needs attention. */
export function SyncStatusBadge() {
  const { state, pendingCount, retry } = useSyncStatus();
  if (state === "restoring") return null;
  const { Icon, title, detail, alert } = copyFor(state, pendingCount);
  if (!alert) return null;
  const label = detail ? `${title}: ${detail}` : title;
  const className = "grid size-9 place-items-center rounded-xl text-nav-accent";
  const icon = <Icon className="size-5" />;

  return state === "retrying" ? (
    <button
      type="button"
      aria-label={`${label}. Retry`}
      title={label}
      onClick={retry}
      className={cn(className, "transition-colors hover:bg-white/8")}
    >
      {icon}
    </button>
  ) : (
    <span role="img" aria-label={label} title={label} className={className}>
      {icon}
    </span>
  );
}
