import { createBoard, type UnitBorder, type UnitFace } from './board';
import type { Board, Coord, Vec2 } from './types';
import type { LatticeOptions } from './square';

const SQRT3 = Math.sqrt(3);

/**
 * Where the hexagon's vertices point. All four hex games in this repo
 * (`dark_hex`, `havannah`, `y`, `hive`) are pointy-top -- their four apparently
 * different corner-angle conventions (`+pi/2`, `+pi/6`, `-pi/2`) all differ by
 * multiples of 60 degrees, so they describe the same hexagon from a different
 * starting corner. The axis they actually differ on is `extent`.
 */
export type HexOrientation = 'pointy' | 'flat';

/**
 * The outline the cells are cut to. Independent of {@link HexOrientation} --
 * conflating the two is what turns a hex module into a one-game module.
 *
 * - `rhombus`  -- `dark_hex`
 * - `hexagon`  -- `havannah`, sized by base length (side 8 gives 169 cells)
 * - `triangle` -- `y`
 *
 * Mapping the games' own board arrays onto axial coords, verified against every
 * step of each game's committed replay:
 *
 * - `dark_hex` -- rectangular `board[row][col]`, so `q = col, r = row`.
 * - `y` -- ragged rows of length `size - row`, and still just `q = col, r = row`.
 * - `havannah` -- ragged rows where row `y` starts at column
 *   `y < size ? 0 : y - size + 1`. Its grid is **left-handed** (`px` uses
 *   `x - y/2` while `py` grows with `y`), so it is a genuine reflection of a
 *   standard axial system, not a translation -- no integer offset reconciles
 *   them, since that needs an even constant and the radius is odd at size 8.
 *   Use `q = x - radius, r = radius - y` together with `flip: { y: true }`.
 */
export type HexExtent = 'rhombus' | 'hexagon' | 'triangle';

export type HexLatticeOptions = LatticeOptions & { orientation?: HexOrientation } & (
    | { extent: 'rhombus'; rows: number; cols: number }
    | { extent: 'hexagon'; size: number }
    | { extent: 'triangle'; size: number }
  );

/** Axial (q, r) -> unit centre, in units of the hexagon's circumradius. */
function axialToUnit(q: number, r: number, orientation: HexOrientation): Vec2 {
  return orientation === 'pointy' ? { x: SQRT3 * (q + r / 2), y: 1.5 * r } : { x: 1.5 * q, y: SQRT3 * (r + q / 2) };
}

function hexCorners(centre: Vec2, orientation: HexOrientation): Vec2[] {
  const offset = orientation === 'pointy' ? -Math.PI / 6 : 0;
  const corners: Vec2[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + offset;
    corners.push({ x: centre.x + Math.cos(angle), y: centre.y + Math.sin(angle) });
  }
  return corners;
}

function axialCoords(options: HexLatticeOptions): Array<[number, number]> {
  const coords: Array<[number, number]> = [];

  if (options.extent === 'rhombus') {
    for (let r = 0; r < options.rows; r++) {
      for (let q = 0; q < options.cols; q++) coords.push([q, r]);
    }
    return coords;
  }

  // `size` is the board's base length, so a hexagon of side N has radius N - 1.
  const radius = options.size - 1;

  if (options.extent === 'hexagon') {
    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (Math.abs(q + r) <= radius) coords.push([q, r]);
      }
    }
    return coords;
  }

  for (let q = 0; q <= radius; q++) {
    for (let r = 0; r <= radius - q; r++) coords.push([q, r]);
  }
  return coords;
}

/**
 * A hex board. Emits faces only -- a hex grid has no meaningful intersections
 * to place stones on, so `points` and `edges` stay empty and `neighborsOf`
 * works off shared polygon sides instead. That matters here: every hex game in
 * the repo is a connection game, so face adjacency is the whole point.
 */
/**
 * The board's outline, as compass-named groups running clockwise from the top.
 *
 * This is what connection games need and currently hand-roll: `dark_hex` colours
 * `'n'`/`'s'` for one player and `'e'`/`'w'` for the other, `havannah` counts its
 * 6 corners and 6 sides for bridges and forks, `y` needs its 3 sides. Corner
 * cells satisfy two sides and appear in both groups -- Havannah's fork rule
 * excludes them, so it should subtract `corners` itself.
 */
function hexBorder(options: HexLatticeOptions): UnitBorder {
  const on = (coords: Array<[number, number]>, predicate: (q: number, r: number) => boolean): Coord[] =>
    coords.filter(([q, r]) => predicate(q, r));
  const coords = axialCoords(options);

  if (options.extent === 'rhombus') {
    const lastQ = options.cols - 1;
    const lastR = options.rows - 1;
    return {
      sides: [
        { id: 'n', coords: on(coords, (_q, r) => r === 0) },
        { id: 'e', coords: on(coords, (q) => q === lastQ) },
        { id: 's', coords: on(coords, (_q, r) => r === lastR) },
        { id: 'w', coords: on(coords, (q) => q === 0) },
      ],
      corners: [
        { id: 'nw', coords: [[0, 0]] },
        { id: 'ne', coords: [[lastQ, 0]] },
        { id: 'se', coords: [[lastQ, lastR]] },
        { id: 'sw', coords: [[0, lastR]] },
      ],
    };
  }

  const radius = options.size - 1;

  if (options.extent === 'hexagon') {
    return {
      sides: [
        { id: 'n', coords: on(coords, (_q, r) => r === -radius) },
        { id: 'ne', coords: on(coords, (q) => q === radius) },
        { id: 'se', coords: on(coords, (q, r) => q + r === radius) },
        { id: 's', coords: on(coords, (_q, r) => r === radius) },
        { id: 'sw', coords: on(coords, (q) => q === -radius) },
        { id: 'nw', coords: on(coords, (q, r) => q + r === -radius) },
      ],
      corners: [
        { id: 'nne', coords: [[radius, -radius]] },
        { id: 'e', coords: [[radius, 0]] },
        { id: 'sse', coords: [[0, radius]] },
        { id: 'ssw', coords: [[-radius, radius]] },
        { id: 'w', coords: [[-radius, 0]] },
        { id: 'nnw', coords: [[0, -radius]] },
      ],
    };
  }

  return {
    sides: [
      { id: 'n', coords: on(coords, (_q, r) => r === 0) },
      { id: 'se', coords: on(coords, (q, r) => q + r === radius) },
      { id: 'sw', coords: on(coords, (q) => q === 0) },
    ],
    corners: [
      { id: 'nw', coords: [[0, 0]] },
      { id: 'ne', coords: [[radius, 0]] },
      { id: 's', coords: [[0, radius]] },
    ],
  };
}

export function hexLattice(options: HexLatticeOptions): Board {
  const orientation = options.orientation ?? 'pointy';

  const declared = options.extent === 'rhombus' ? Math.min(options.rows, options.cols) : options.size;
  if (!Number.isInteger(declared) || declared < 1) {
    throw new Error(`hexLattice needs a positive integer size, got ${declared} for extent '${options.extent}'.`);
  }

  const faces: UnitFace[] = axialCoords(options).map(([q, r]) => {
    const centre = axialToUnit(q, r, orientation);
    return { coord: [q, r], corners: hexCorners(centre, orientation) };
  });

  return createBoard({ primary: 'face', points: [], edges: [], faces, border: hexBorder(options) }, options);
}
