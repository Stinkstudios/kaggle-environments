import { REGISTRY, FAMILIES } from './generated/registry';
import type { PieceAsset, FamilyInfo, Frame, Size, RenderTarget } from './types';

export type { PieceAsset, FamilyInfo, Frame, Size, RenderTarget };

export interface ResolveOptions {
  /**
   * A family to try first, for variant families that overlay a base one.
   * Falls through to `id`'s own family when the variant doesn't override
   * this piece.
   */
  prefer?: string;
}

/**
 * Resolve one piece by stable id, e.g. `pieceAsset('chess:w-king')`.
 *
 * Returns `null` when no artwork exists yet. Callers should pass the null
 * through to a component that falls back to programmatic rendering — and
 * report the gap. Never substitute a different piece's art.
 *
 * `prefer` handles variant families, which declare only the pieces that differ
 * from the family they overlay rather than duplicating art that didn't change:
 *
 * ```ts
 * pieceAsset('card:a-club',  { prefer: 'card-four-color' }) // green club
 * pieceAsset('card:a-spade', { prefer: 'card-four-color' }) // base deck spade
 * ```
 *
 * The fallback is the whole point. `card-four-color` holds only diamonds and
 * clubs, so addressing it directly would return null for every spade, heart,
 * the back and the joker. Pass the base id and prefer the variant, and a caller
 * never has to know which pieces the variant happens to override.
 *
 * A `prefer` family that doesn't exist resolves to the base piece rather than
 * throwing — a missing variant degrades to the standard artwork, which is the
 * safe direction, but it does mean a typo'd family name fails quietly.
 */
export function pieceAsset(id: string, options?: ResolveOptions): PieceAsset | null {
  const { prefer } = options ?? {};

  if (prefer) {
    const sep = id.indexOf(':');
    const overridden = REGISTRY[`${prefer}:${sep === -1 ? id : id.slice(sep + 1)}`];
    if (overridden) return overridden;
  }

  return REGISTRY[id] ?? null;
}

/**
 * Everything a renderer needs to bring up one family at once: the atlas for
 * Pixi, the individual URLs for DOM, and the honest list of what's missing.
 */
export function pieceFamily(family: string): FamilyInfo {
  const fam = FAMILIES[family];
  const pieces = Object.values(REGISTRY).filter((p) => p.family === family);

  return {
    family,
    targets: (fam?.targets ?? ['pixi', 'dom']) as RenderTarget[],
    atlasUrl: fam?.atlasUrl ?? null,
    atlasData: fam?.atlasData ?? null,
    atlasSize: fam?.atlasSize ?? null,
    individual: fam?.individual ?? false,
    pieces,
    missing: fam?.missing ?? [],
  };
}

/** Every id that resolves to real artwork. */
export function pieceIds(family?: string): string[] {
  const all = Object.values(REGISTRY);
  return (family ? all.filter((p) => p.family === family) : all).map((p) => p.id);
}

/**
 * Every declared-but-undrawn piece across all families. Wire this into a
 * dev-time warning so a half-assets/half-programmatic family is loud rather
 * than quietly shipped.
 */
export function missingPieces(): string[] {
  return Object.values(FAMILIES).flatMap((f) => f.missing);
}
