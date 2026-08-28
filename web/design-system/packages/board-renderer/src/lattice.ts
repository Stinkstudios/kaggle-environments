import { latticeStrokes, type Board, type Face, type Vec2 } from '@kaggle-environments/board';
import { Container, Graphics, Sprite, TilingSprite, type Texture } from 'pixi.js';
import { complementFaces, faceRadius, HEX_ART_FIT, hexRotation } from './hex';
import { requireTexture, type TextureMap } from './textures';

/**
 * The board-line treatments this design system offers.
 *
 * Named rather than parameterised, so that restyling every board in the repo is
 * a change here instead of a change in N renderers. Each style owns its own
 * metrics -- tile scale, line height, how a run is anchored and rotated --
 * which is precisely the set of numbers `go` hardcodes today.
 *
 * - `plain`         -- a flat stroke. `chess`'s 1px black grid.
 * - `squiggle-dash` -- a dashed hand-drawn strip tiled along each run. `go`'s line.
 *
 * The `-dash` suffix is not noise: the same hand-drawn set has a solid variant
 * (`squiggle-solid.png`, already in `design-system-tokens` for the DOM), so a
 * bare `squiggle` would have to be renamed across every board the moment it
 * lands. Naming the variant now costs nothing; renaming later costs a
 * coordinated change.
 */
export type GridStyleName = 'plain' | 'squiggle-dash';

interface PlainGrid {
  style?: 'plain';
  color?: number;
  width?: number;
  alpha?: number;
  /**
   * Nudge each line onto a half-pixel so a 1px stroke lands on one device pixel
   * instead of straddling two. `chess` already does this by hand
   * (`Math.round(pos) + 0.5`); it is only correct for axis-aligned lattices, so
   * it is off by default and a hex board should leave it off.
   */
  crisp?: boolean;
}

interface SquiggleGrid {
  style: 'squiggle-dash';
  /**
   * A loaded texture map to resolve the style's own artwork from. The style
   * knows which asset it wants; the caller only has to have loaded the family.
   */
  textures?: TextureMap;
  /** Or hand over a strip directly, overriding the style's artwork. */
  texture?: Texture;
  /** Tint. Left untinted by default. */
  color?: number;
  alpha?: number;
  /**
   * How far down the texture is scaled. The drawn line height follows from it,
   * so the strip keeps its aspect and the brush never stretches.
   */
  tileScale?: number;
}

export type GridOptions = PlainGrid | SquiggleGrid;

/**
 * The metrics and artwork each named style owns. Change a board's look here,
 * once, rather than in every renderer.
 *
 * The asset lives in the shared `board` family, not a game's own -- board
 * furniture is not any one game's art. That is what lets `chess` reach the same
 * line `go` draws.
 */
const PLAIN_DEFAULTS = { color: 0x000000, width: 1, alpha: 1, crisp: false };
const SQUIGGLE_DEFAULTS = { color: 0xffffff, alpha: 1, tileScale: 0.5 };
const SQUIGGLE_ASSET_ID = 'board:squiggle-dash';

/**
 * Draw the lattice's lines -- Go's grid, Dots & Boxes' frame, Nine Men's Morris'
 * board -- in one of the design system's board-line styles.
 *
 * Both styles draw the *merged* runs from `latticeStrokes`, not the raw edges.
 * For `plain` that is only an efficiency; for the textured styles it is
 * correctness: one sprite per lattice edge would restart the brush at every
 * intersection and leave a seam there.
 *
 * Draws nothing for a face-only board; see {@link drawFaces}.
 */
export function drawGrid(board: Board, options: GridOptions = {}): Container {
  const strokes = latticeStrokes(board);

  if (options.style === 'squiggle-dash') {
    const { textures, color, alpha, tileScale } = { ...SQUIGGLE_DEFAULTS, ...options };
    // The style resolves its own artwork; an explicit `texture` overrides it.
    const texture = options.texture ?? (textures ? requireTexture(textures, SQUIGGLE_ASSET_ID) : undefined);
    if (!texture) {
      throw new Error(
        `[board-renderer] the '${options.style}' grid style needs artwork. Pass \`textures\` ` +
          `(having loaded the shared 'board' asset family, which carries ${SQUIGGLE_ASSET_ID}), ` +
          `or pass \`texture\` to override the style's own.`
      );
    }
    const container = new Container();

    for (const { a, b } of strokes) {
      const line = new TilingSprite({
        texture,
        width: Math.hypot(b.x - a.x, b.y - a.y),
        height: texture.height * tileScale,
        applyAnchorToTexture: true,
      });
      line.clampMargin = 0;
      line.tileScale.set(tileScale);
      line.anchor.set(0, 0.5);
      line.position.set(a.x, a.y);
      line.rotation = Math.atan2(b.y - a.y, b.x - a.x);
      line.tint = color;
      line.alpha = alpha;
      container.addChild(line);
    }

    return container;
  }

  const { color, width, alpha, crisp } = { ...PLAIN_DEFAULTS, ...options };
  const graphics = new Graphics();
  const snap = crisp ? (value: number) => Math.round(value) + 0.5 : (value: number) => value;

  for (const { a, b } of strokes) {
    graphics.moveTo(snap(a.x), snap(a.y)).lineTo(snap(b.x), snap(b.y));
  }

  // One stroke call for the whole lattice: a single geometry and a single draw
  // call, rather than one per line.
  graphics.stroke({ color, width, alpha });
  return graphics;
}

export interface FacesOptions {
  /**
   * Fill colour per face, or `null` to leave it unpainted. Chess's checker is
   * `(face) => (face.coord[0] + face.coord[1]) % 2 ? DARK : null` -- light
   * squares are the background showing through, exactly as `chess` draws them
   * today.
   */
  fill?: (face: Face, index: number) => number | null;
  fillAlpha?: number;
  stroke?: { color: number; width: number; alpha?: number } | null;
}

/**
 * Fill and/or outline the lattice's cells -- Chess's checkerboard, and every
 * hex game's tiling.
 *
 * Uses `face.corners`, which are real final coordinates rather than a
 * centre/radius pair, so the polygon drawn is exactly the one the generator
 * laid out. Hex, rhombus and triangle extents need no special case here.
 *
 * This is the *programmatic* cell treatment. Where the design system has drawn
 * artwork for the cell -- it has, for hexagons -- {@link drawFaceSprites} is the
 * one to reach for; redrawing a hand-drawn outline with `Graphics.stroke` is
 * exactly the substitution `skills/assets.md` rules out.
 */
export function drawFaces(board: Board, options: FacesOptions = {}): Graphics {
  const { fill, fillAlpha = 1, stroke = null } = options;
  const graphics = new Graphics();

  board.faces.forEach((face, index) => {
    const color = fill ? fill(face, index) : null;
    if (color === null && !stroke) return;

    graphics.poly(face.corners.map((corner) => [corner.x, corner.y]).flat());
    if (color !== null) graphics.fill({ color, alpha: fillAlpha });
    if (stroke) graphics.stroke({ color: stroke.color, width: stroke.width, alpha: stroke.alpha ?? 1 });
  });

  return graphics;
}

/**
 * The cell treatments this design system offers -- for boards where the cells
 * themselves are the artwork, rather than the lines between them.
 *
 * Named rather than parameterised for the same reason {@link GridStyleName} is:
 * restyling every hex board in the repo should be a change here, not a change
 * in N renderers.
 *
 * - `hex-solid`      -- a hand-drawn hexagon outline, one per cell.
 * - `hex-half-solid` -- three contiguous edges of it, so a tiling draws each
 *   shared edge once rather than twice. Half the sprites, and interior lines
 *   stop carrying more weight than the boundary. Prefer this for a board;
 *   `hex-solid` remains right for a cell shown on its own.
 *
 * The `-solid` suffix mirrors `squiggle-dash`: the same hand-drawn set has
 * dashed variants coming, and a bare `hex` would need renaming across every
 * board the day they land.
 */
export type FaceStyleName = 'hex-solid' | 'hex-half-solid';

export interface FaceSpritesOptions {
  /** Defaults to `hex-solid`, the only cell style drawn so far. */
  style?: FaceStyleName;
  /**
   * A loaded texture map to resolve the style's own artwork from. The style
   * knows which asset it wants; the caller only has to have loaded the family.
   */
  textures?: TextureMap;
  /** Or hand over artwork directly, overriding the style's own. */
  texture?: Texture;
  /**
   * Tint. Left untinted by default. Note the masters are black on transparent,
   * so a tint can only darken -- the family is not `tintable`.
   */
  color?: number;
  alpha?: number;
  /**
   * Multiplier on the fitted size. Defaults to {@link HEX_ART_FIT}, which seats
   * the drawn stroke's *centreline* on the cell boundary so neighbouring
   * outlines meet rather than leaving a gap -- fitting the raw canvas draws the
   * hexagon 2.5% small, because the master is cropped to the outside of a stroke
   * with real width. Pass 1 to see the uncorrected fit. Nudge it here rather
   * than by editing the master.
   */
  scale?: number;
  /**
   * For a half style, also draw the complement -- the same artwork turned 180
   * degrees -- on cells that have an outside edge, closing the board's outline.
   * Defaults to true, because an open outline reads as unfinished.
   *
   * Set false when the game draws its own border. Every hex game here is a
   * connection game that already does: `dark_hex` colours n/s and e/w,
   * `havannah` needs its 6 sides and 6 corners, `y` its 3 -- all of which come
   * off `board.sides` via {@link drawBorder}. Doubling a boundary the game is
   * about to draw over is worth avoiding.
   *
   * Ignored by whole-outline styles, which have no boundary to close.
   */
  closeBoundary?: boolean;
}

const FACE_STYLE_ASSETS: Record<FaceStyleName, string> = {
  'hex-solid': 'board:hex-solid',
  'hex-half-solid': 'board:hex-half-solid',
};

/** Styles that draw a partial outline and so need the boundary closing. */
const HALF_STYLES: ReadonlySet<FaceStyleName> = new Set<FaceStyleName>(['hex-half-solid']);
const FACE_SPRITE_DEFAULTS = { color: 0xffffff, alpha: 1, scale: HEX_ART_FIT, closeBoundary: true };

/**
 * Draw the design system's hand-drawn cell artwork, one sprite per face.
 *
 * The counterpart to {@link drawGrid} for face lattices. It is a separate
 * function rather than another `GridStyleName` because the two consume
 * different geometry: `drawGrid` tiles a strip along the *merged runs* of
 * `latticeStrokes`, and a closed outline cannot feed that -- there is no run to
 * tile it along. This walks `board.faces` instead.
 *
 * Every interior edge belongs to two cells, so it is drawn twice, once by each
 * neighbour. With hand-drawn art the two strokes do not coincide, which is the
 * cell-by-cell look the artwork is going for -- but it does mean interior lines
 * carry more weight than the boundary. `Board renderer/Hex cell styles` in
 * Storybook shows it against the programmatic `drawFaces` stroke, so the call
 * can be made by looking.
 */
export function drawFaceSprites(board: Board, options: FaceSpritesOptions = {}): Container {
  const { textures, color, alpha, scale, closeBoundary } = { ...FACE_SPRITE_DEFAULTS, ...options };
  const style = options.style ?? 'hex-solid';
  const assetId = FACE_STYLE_ASSETS[style];

  const texture = options.texture ?? (textures ? requireTexture(textures, assetId) : undefined);
  if (!texture) {
    throw new Error(
      `[board-renderer] the '${style}' cell style needs artwork. Pass \`textures\` ` +
        `(having loaded the shared 'board' asset family, which carries ${assetId}), ` +
        `or pass \`texture\` to override the style's own.`
    );
  }

  const container = new Container();
  const complement = HALF_STYLES.has(style) && closeBoundary ? complementFaces(board) : null;

  board.faces.forEach((face, index) => {
    // Pointing hex artwork at a square lattice silently draws hexagons over the
    // squares, which survives review as "a style choice". Say what's wrong.
    if (face.corners.length !== 6) {
      throw new Error(
        `[board-renderer] the '${style}' cell style needs hexagonal faces, but face ` +
          `[${face.coord.join(', ')}] has ${face.corners.length} corners. Use drawFaces() for this board.`
      );
    }

    const radius = faceRadius(face);

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(face.x, face.y);
    sprite.scale.set(((2 * radius) / texture.height) * scale);
    sprite.rotation = hexRotation(face);
    sprite.tint = color;
    sprite.alpha = alpha;
    container.addChild(sprite);

    if (complement?.has(index)) {
      const other = new Sprite(texture);
      other.anchor.set(0.5);
      other.position.set(face.x, face.y);
      other.scale.set(sprite.scale.x);
      other.rotation = sprite.rotation + Math.PI;
      other.tint = color;
      other.alpha = alpha;
      container.addChild(other);
    }
  });

  return container;
}

/**
 * Stroke a border group's outward-facing facets -- the goal markers connection
 * games need. `board.sides` carries the segments; this just draws them.
 *
 * ```ts
 * const [north] = board.sides.filter((side) => side.id === 'n');
 * container.addChild(drawBorder(north.segments, { color: 0xff0000, width: 4 }));
 * ```
 */
export function drawBorder(
  segments: ReadonlyArray<readonly [Vec2, Vec2]>,
  options: { color: number; width: number; alpha?: number }
): Graphics {
  const graphics = new Graphics();
  for (const [from, to] of segments) {
    graphics.moveTo(from.x, from.y).lineTo(to.x, to.y);
  }
  graphics.stroke({ color: options.color, width: options.width, alpha: options.alpha ?? 1 });
  return graphics;
}
