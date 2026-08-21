/** A rectangle within a packed atlas, in atlas pixel coordinates. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

/**
 * One resolved piece. Both render targets read the same object.
 *
 * Atlas-only families (the default) expose `url: null`; DOM renders from
 * `atlasUrl` + `frame` + `atlasSize` via CSS background-position. Families that
 * set `"individual": true` in families.json also get a standalone `url`, which
 * DOM prefers — that's for families like cards, shown one face at a time.
 */
export interface PieceAsset {
  /** Stable id, e.g. "chess:w-king". */
  id: string;
  family: string;
  /** Standalone image URL, or null when the family is atlas-only. */
  url: string | null;
  /** Packed sheet URL. Null only if the family isn't packed. */
  atlasUrl: string | null;
  /** Sheet dimensions — DOM needs these to compute background-size. */
  atlasSize: Size | null;
  /** Position within the sheet. Always untrimmed, so usable directly from CSS. */
  frame: Frame | null;
  /**
   * The artwork's natural pixel size. For atlas families this equals the frame;
   * for individual families it comes from the family's declared `sourceSize`.
   * Components use it to size aspect-correctly instead of guessing a square.
   */
  sourceSize: Size | null;
  /** Human-readable alt text. Empty string for decorative art. */
  label: string;
  /** True when the piece carries no information and must not be announced. */
  decorative: boolean;
  /** True when the artwork is a neutral master intended to be tinted. */
  tintable: boolean;
}

export type RenderTarget = 'pixi' | 'dom';

export interface FamilyInfo {
  family: string;
  /**
   * Which renderers this family promises to serve. A family without an atlas
   * cannot serve 'pixi' — the build refuses that combination outright.
   */
  targets: RenderTarget[];
  atlasUrl: string | null;
  /** Raw atlas descriptor, ready to hand to Pixi's Spritesheet constructor. */
  atlasData: unknown | null;
  atlasSize: Size | null;
  /** Whether this family also emits one file per piece. */
  individual: boolean;
  pieces: PieceAsset[];
  /** Declared in families.json but not yet drawn. Report these; never fake them. */
  missing: string[];
}
