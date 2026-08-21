import { REGISTRY, FAMILIES } from './generated/registry';
import type { PieceAsset, FamilyInfo, Frame, Size, RenderTarget } from './types';

export type { PieceAsset, FamilyInfo, Frame, Size, RenderTarget };

/**
 * Resolve one piece by stable id, e.g. `pieceAsset('chess:w-king')`.
 *
 * Returns `null` when no artwork exists yet. Callers should pass the null
 * through to a component that falls back to programmatic rendering — and
 * report the gap. Never substitute a different piece's art.
 */
export function pieceAsset(id: string): PieceAsset | null {
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
