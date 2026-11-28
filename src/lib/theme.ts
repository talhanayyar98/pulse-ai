/**
 * Raw palette values for places that cannot read CSS variables
 * (web manifest, viewport meta, generated icons).
 * Must match the tokens in src/app/globals.css — enforced by tests/unit/tokens.test.ts.
 */
export const palette = {
  canvas: "#f6f3ee",
  nav: "#1c2a42",
  brand: "#b5502b",
  brandStrong: "#9c4120",
  onBrand: "#ffffff",
} as const;
