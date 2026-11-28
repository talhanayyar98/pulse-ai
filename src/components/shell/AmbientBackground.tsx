/**
 * Fixed, decorative paper behind every screen: two faint washes of terracotta and blue drifting
 * very slowly, with ink grain for texture. Pure CSS: no JS, no layout cost.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[35vmax] -right-[25vmax] size-[75vmax] animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-brand)_8%,transparent),transparent_62%)]" />
      <div className="absolute -bottom-[40vmax] -left-[30vmax] size-[80vmax] animate-drift-slow rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-info)_7%,transparent),transparent_60%)]" />
      <div className="absolute inset-0 bg-grain opacity-[0.05]" />
    </div>
  );
}
