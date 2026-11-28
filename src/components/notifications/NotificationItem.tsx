"use client";

import { formatDistanceStrict } from "date-fns";
import { motion } from "motion/react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { AlertIcon, BellIcon, CheckIcon, ClockIcon, HourglassIcon } from "@/components/ui/icons";
import type { NotificationView } from "@/lib/client/notifications";
import { cn } from "@/lib/cn";
import type { NotificationKind } from "@/lib/domain/notifications";
import { formatDue } from "@/lib/due-date";
import { springs } from "@/lib/motion";
import { trackSpotlight } from "@/lib/spotlight";
import { formatAgo } from "@/lib/time-ago";

const KIND: Record<
  NotificationKind,
  { Icon: ComponentType<SVGProps<SVGSVGElement>>; avatar: string }
> = {
  overdue: { Icon: AlertIcon, avatar: "bg-danger/10 text-danger ring-danger/25" },
  due_soon: { Icon: ClockIcon, avatar: "bg-warning/10 text-warning ring-warning/25" },
  stuck: { Icon: HourglassIcon, avatar: "bg-progress/10 text-progress ring-progress/25" },
  completed: { Icon: CheckIcon, avatar: "bg-success/10 text-success ring-success/25" },
  reminder: { Icon: BellIcon, avatar: "bg-brand/10 text-brand-text ring-brand/25" },
};

function message({ kind, task, ref }: NotificationView, now: Date): ReactNode {
  const title = <strong className="font-semibold text-fg">{task.title}</strong>;
  switch (kind) {
    case "overdue":
      return <>{title} is overdue.</>;
    case "due_soon":
      return (
        <>
          {title} is due {formatDistanceStrict(ref, now, { addSuffix: true })}.
        </>
      );
    case "stuck":
      return (
        <>
          {title} has been in progress for {formatDistanceStrict(ref, now)}.
        </>
      );
    case "completed":
      return <>You finished {title}. Nice work!</>;
    case "reminder":
      return <>Reminder: {title}</>;
  }
}

function detail({ kind, task, ref }: NotificationView, now: Date): string | null {
  switch (kind) {
    case "overdue":
      return `Was due ${formatDue(task, now)}`;
    case "due_soon":
      return formatDue(task, now);
    case "stuck":
      return "Finish it, or move it back?";
    case "completed":
      return null;
    case "reminder":
      if (!task.dueAt) return null;
      return `${ref < now ? "Was due" : "Due"} ${formatDue(task, now)}`;
  }
}

export function NotificationItem({
  item,
  index,
  now,
  onOpen,
  onToggleRead,
}: Readonly<{
  item: NotificationView;
  index: number;
  now: Date;
  onOpen: () => void;
  onToggleRead: () => void;
}>) {
  const { Icon, avatar } = KIND[item.kind];
  const extra = detail(item, now);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ default: { ...springs.snappy, delay: index * 0.035 }, layout: springs.snappy }}
      className="group/item relative"
    >
      <button
        type="button"
        onClick={onOpen}
        onPointerMove={trackSpotlight}
        className={cn(
          "spotlight flex w-full items-start gap-3 rounded-xl p-2.5 pr-10 text-left transition-colors duration-200 hover:bg-fg/4",
          item.unread && "bg-info/6",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full ring-1 transition-transform duration-300 ease-spring group-hover/item:scale-110",
            avatar,
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          {item.unread && <span className="sr-only">Unread: </span>}
          <span
            className={cn(
              "block text-sm leading-snug",
              item.unread ? "text-fg" : "text-fg-secondary",
            )}
          >
            {message(item, now)}
          </span>
          <span
            className={cn(
              "mt-1 block text-xs",
              item.unread ? "font-medium text-info" : "text-fg-muted",
            )}
          >
            {formatAgo(item.at, now)}
            {extra && <span className="text-fg-muted"> · {extra}</span>}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`Mark “${item.task.title}” as ${item.unread ? "read" : "unread"}`}
        title={item.unread ? "Mark as read" : "Mark as unread"}
        onClick={onToggleRead}
        className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full transition-colors hover:bg-fg/6"
      >
        <span
          className={cn(
            "size-2.5 rounded-full transition-[background-color,box-shadow,opacity] duration-200",
            item.unread ? "bg-info" : "opacity-0 ring-1 ring-fg-muted group-hover/item:opacity-100",
          )}
        />
      </button>
    </motion.li>
  );
}
