import { latticeStrokes, type Board, type Face, type Vec2 } from '@kaggle-environments/board';
import { Container, Graphics, TilingSprite, type Texture } from 'pixi.js';
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
