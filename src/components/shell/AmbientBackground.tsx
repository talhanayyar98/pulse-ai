/**
 * Fixed, decorative aurora behind every screen: violet, fuchsia and cyan light drifting
 * over a faint grid, with film grain so the gradients never band. Pure CSS: no JS, no layout cost.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[35vmax] -left-[25vmax] size-[80vmax] animate-drift rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.26),transparent_62%)]" />
      <div className="absolute -right-[30vmax] -bottom-[40vmax] size-[85vmax] animate-drift-slow rounded-full bg-[radial-gradient(circle,rgb(192_38_211/0.2),transparent_60%)]" />
      <div className="absolute top-[10vh] -right-[20vmax] size-[50vmax] animate-drift-fast rounded-full bg-[radial-gradient(circle,rgb(34_211_238/0.09),transparent_62%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.028)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.028)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_top,black,transparent_70%)] bg-size-[48px_48px]" />
      <div className="absolute inset-0 bg-grain opacity-[0.035] mix-blend-overlay" />
    </div>
  );
}
