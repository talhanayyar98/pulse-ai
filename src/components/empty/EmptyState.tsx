import type { ReactNode } from "react";

export function EmptyState({
  illustration,
  title,
  body,
  action,
}: Readonly<{ illustration: ReactNode; title: string; body: string; action?: ReactNode }>) {
  return (
    <div className="mx-auto flex max-w-sm animate-fade-up flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 scale-125 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-brand)_12%,transparent),transparent_65%)] blur-xl"
        />
        <div className="animate-float">{illustration}</div>
      </div>
      <h2 className="text-3xl text-fg">{title}</h2>
      <p className="mt-2 text-sm text-fg-secondary">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
