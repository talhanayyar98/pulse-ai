import { cn } from "@/lib/cn";
import { PRIORITY_LABEL, type Priority } from "@/lib/domain/task";

const LEVEL: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

const TONE: Record<Priority, string> = {
  low: "text-slate",
  medium: "text-info",
  high: "text-warning",
  urgent: "text-danger",
};

/** Signal-strength bars, warming from slate (low) through blue and amber to rose (urgent). */
export function PriorityIcon({
  priority,
  className,
}: Readonly<{ priority: Priority; className?: string }>) {
  const level = LEVEL[priority];
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={`${PRIORITY_LABEL[priority]} priority`}
      className={cn("size-4 shrink-0", TONE[priority], className)}
    >
      {[0, 1, 2, 3].map((bar) => (
        <rect
          key={bar}
          x={1 + bar * 3.75}
          y={13 - (bar + 1) * 3}
          width="2.5"
          height={(bar + 1) * 3}
          rx="1"
          className={bar < level ? "fill-current" : "fill-fg/12"}
        />
      ))}
    </svg>
  );
}
