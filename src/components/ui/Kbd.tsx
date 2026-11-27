import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Kbd({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-current/25 px-1 font-mono text-[11px] leading-none",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
