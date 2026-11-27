import type { ReactNode } from "react";

export function EmptyState({
  illustration,
  title,
  body,
  action,
}: Readonly<{ illustration: ReactNode; title: string; body: string; action?: ReactNode }>) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
      <div className="mb-6 animate-float">{illustration}</div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-fg-secondary">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
