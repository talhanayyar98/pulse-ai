import type { ReactNode } from "react";

export function ViewHeader({
  title,
  tagline,
  aside,
}: Readonly<{ title: string; tagline: string; aside?: ReactNode }>) {
  return (
    <header className="px-5 pt-8 pb-6 md:px-8 md:pt-10">
      <div className="flex items-center gap-3">
        <h1 className="text-gradient text-3xl font-semibold md:text-4xl">{title}</h1>
        {aside}
      </div>
      <p className="mt-1.5 animate-fade-up text-sm text-fg-secondary [animation-delay:80ms]">
        {tagline}
      </p>
    </header>
  );
}
