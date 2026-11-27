export function ViewHeader({ title, tagline }: Readonly<{ title: string; tagline: string }>) {
  return (
    <header className="px-5 pt-8 pb-6 md:px-8 md:pt-10">
      <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
      <p className="mt-1.5 text-sm text-fg-secondary">{tagline}</p>
    </header>
  );
}
