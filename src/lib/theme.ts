/**
 * Raw palette values for places that cannot read CSS variables
 * (web manifest, viewport meta, generated icons).
 * Must match the tokens in src/app/globals.css — enforced by tests/unit/tokens.test.ts.
 */
export const palette = {
  canvas: "#07070b",
  brand: "#8b5cf6",
  brandDeep: "#5b21b6",
  brandStrong: "#7c3aed",
  neon: "#39ff14",
} as const;
