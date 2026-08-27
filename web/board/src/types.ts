/**
 * The shared vocabulary for every board in the repo.
 *
 * A board is described by three kinds of element, and which ones a generator
 * emits is meaningful:
 *
 * - **points** -- intersections. Go and Nine Men's Morris put stones here.
 * - **faces**  -- enclosed cells. Chess, Othello and the hex games put pieces here.
 * - **edges**  -- the connections between points. Dots & Boxes plays *on* these.
 *
 * Go, Chess and Dots & Boxes are the same square lattice read at three different
 * element kinds, which is why one generator serves all three. A generator that
 * has no faces (a hex board has no meaningful intersections; an irregular graph
 * has no cells) leaves that array empty rather than inventing entries -- absence
 * carries information.
 */

/**
 * An element's address within its lattice.
 *
 * Structured, not stringly-typed: a square lattice point is `[row, col]`, an
 * edge is `[row, col, 'h' | 'v']`, a hex face is `[q, r]`, a graph node is
 * `[index]`. Address elements by coord. Never parse an `id` -- see {@link Point.id}.
 */
export type Coord = readonly (number | string)[];

/** Stable string form of a {@link Coord}, for use as a Map/Record key. */
export function coordKey(coord: Coord): string {
  return coord.join(',');
}

export interface Vec2 {
  x: number;
  y: number;
}

interface ElementBase {
  /**
   * Opaque and stable within one board. Useful as a Map key or a Pixi child
   * name; **not** something to parse. If you find yourself splitting an id,
   * you want the `coord` instead.
   */
  readonly id: string;
  readonly coord: Coord;
  /** Final coordinates -- already scaled and positioned by `fit`. */
  readonly x: number;
  readonly y: number;
}

/** An intersection. Go stones and Nine Men's Morris men sit on these. */
export interface Point extends ElementBase {
  readonly kind: 'point';
}

/** A connection between two points. Dots & Boxes lines are these. */
export interface Edge extends ElementBase {
  readonly kind: 'edge';
  readonly a: Point;
  readonly b: Point;
  /** Radians, `atan2(b.y - a.y, b.x - a.x)`. Screen space, so y grows downward. */
  readonly angle: number;
  readonly length: number;
}

/**
 * An enclosed cell. Chess squares and hex cells are these.
 *
 * `corners` are real final coordinates rather than a `sides`/`radius` pair, so
 * a caller can stroke or fill the exact polygon the generator laid out with no
 * chance of the two drifting apart.
 */
export interface Face extends ElementBase {
  readonly kind: 'face';
  readonly corners: readonly Vec2[];
}

export type Element = Point | Edge | Face;
export type ElementKind = Element['kind'];

/**
 * Fit the board into a box.
 *
 * Replaces the `padding -> innerW/innerH -> cellSize = min(...) -> centred origin`
 * block that is currently copy-pasted into roughly 17 renderers.
 *
 * Omit `fit` entirely and you get **unit space**: `scale` is 1, one lattice step
 * is one unit, and the board's top-left sits at the origin. That is the form the
 * tests assert against, and it needs no renderer and no DOM.
 */
export interface Fit {
  width: number;
  height: number;
  /** Space reserved outside the board's extent -- for coordinate labels. Default 0. */
  padding?: number;
  /**
   * Floor on the scale factor. Matches the `Math.max(12, ...)` clamps several
   * renderers already apply. A clamped board may overflow its box; that is the
   * existing behaviour and is preserved deliberately.
   */
  minScale?: number;
}

/** Mirror the board about its own centre. `chess` needs this for Black's view. */
export interface Flip {
  x?: boolean;
  y?: boolean;
}

/**
 * One outer side or corner of the board, as the elements lying on it.
 *
 * Connection games are the reason this is geometry rather than per-game code:
 * Hex needs to know which cells are the TOP versus the LEFT edge, Havannah needs
 * its 6 corners and 6 edges, Y needs its 3 sides. `havannah/…/renderer.ts`
 * currently hand-rolls this as a `classifyCell` helper.
 *
 * Ids are compass directions on screen, and the arrays run clockwise from the
 * top. A corner cell satisfies two sides at once and so appears in both `sides`
 * groups as well as in `corners` -- which is what Hex wants. Havannah's fork
 * rule explicitly excludes corners, so it should subtract `corners` itself.
 */
export interface BorderGroup {
  /** A compass direction on screen: `'n'`, `'ne'`, `'sse'` and so on. */
  id: string;
  elements: readonly Element[];
  /**
   * The outward-facing polygon facets along this side, ready to stroke as the
   * player's goal marker. A facet is a board boundary exactly when only one
   * face touches it, so these fall out of the same table adjacency uses.
   *
   * Empty on boards whose primary element is a point -- there are no polygons
   * to take a facet from.
   */
  segments: ReadonlyArray<readonly [Vec2, Vec2]>;
}

export interface Hit {
  readonly element: Element;
  /** 0 when the pixel is inside a face; otherwise distance to the element. */
  readonly distance: number;
}

export interface HitTestOptions {
  /** Defaults to `[board.primary]` -- the kind the board was generated for. */
  kinds?: readonly ElementKind[];
  /** Defaults to half of {@link Board.pitch} for points, a third for edges. */
  maxDistance?: number;
}

export interface Board {
  readonly points: readonly Point[];
  readonly edges: readonly Edge[];
  readonly faces: readonly Face[];

  /**
   * The element kind this board was generated for: `'point'` for a Go-style
   * lattice or an irregular graph, `'face'` for a Chess- or hex-style one.
   * Drives the default of {@link Board.hitTest}.
   */
  readonly primary: ElementKind;

  /** Top-left of the board's own extent, in final coordinates. */
  readonly origin: Vec2;
  /** The board's actual extent -- not the `fit` box it was centred in. */
  readonly width: number;
  readonly height: number;
  /** Final units per lattice unit. 1 in unit space. */
  readonly scale: number;
  /**
   * Median distance between adjacent elements, in final units. The number to
   * derive stone radii, line widths and font sizes from.
   */
  readonly pitch: number;

  /**
   * The board's outer sides, clockwise from the top, holding elements of
   * {@link Board.primary}. Empty for boards with no meaningful outline.
   */
  readonly sides: readonly BorderGroup[];
  /** The extreme elements where two sides meet, clockwise from the top. */
  readonly corners: readonly BorderGroup[];

  pointAt(coord: Coord): Point | null;
  edgeAt(coord: Coord): Edge | null;
  faceAt(coord: Coord): Face | null;

  /**
   * Adjacent elements of the same kind -- points via edges, faces via a shared
   * polygon side. Prebuilt at construction: a flood fill over a 19x19 Go board
   * is 361x684 iterations if this is recomputed per call.
   */
  neighborsOf(element: Point | Face): readonly (Point | Face)[];

  /**
   * Pixel -> element. Faces use exact containment; points and edges use nearest
   * within a distance bound.
   *
   * Stays consistent with the forward transform by construction, since both read
   * the same laid-out geometry.
   */
  hitTest(x: number, y: number, options?: HitTestOptions): Hit | null;
}
