import type { ReactNode } from "react";

/** Re-mounts on every view change, replaying a CSS entrance (works before JS hydrates). */
export default function AppTemplate({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="flex flex-1 animate-view-in flex-col">{children}</div>;
}
