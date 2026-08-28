import type { Board, Face } from '@kaggle-environments/board';

/**
 * The geometry behind the `hex-solid` cell style, kept clear of PixiJS so it can
 * be asserted without a GPU -- the same split `latticeStrokes` and
 * `labelPlacements` already make.
 */

/**
 * The angle, from the centre, of a vertex in the `board:hex-solid` master. It is
 * drawn pointy-top, so a vertex points straight up -- and screen space has y
 * growing downward, hence the negative quarter turn.
 */
export const HEX_ASSET_VERTEX_ANGLE = -Math.PI / 2;

/**
 * Where the master's stroke *centreline* sits, as a fraction of the canvas's
 * half-height.
 *
 * The artwork is cropped to the outside of a stroke with real width, so fitting
 * the canvas to the cell seats the drawn line inside it and neighbouring
 * outlines never touch. Measured off `hex-solid.png` by taking the
 * alpha-weighted mean projection onto each of the six edge normals, sampling
 * only the flat middle of each edge so the vertices don't skew it: the six agree
 * to within 0.24%, giving a centreline circumradius of 169.72 against a canvas
 * half-height of 174.
 *
 * Fitting the canvas would therefore draw the hexagon at 97.5% of the cell and
 * leave a 2.5% gap at every shared edge. {@link HEX_ART_FIT} is the reciprocal
 * that cancels it, and is the default `scale` the style ships with.
 */
export const HEX_ART_CENTRELINE_RATIO = 169.72 / 174;

/** Scale that seats the drawn centreline on the cell boundary. */
export const HEX_ART_FIT = 1 / HEX_ART_CENTRELINE_RATIO;

/** A hexagon maps onto itself every 60 degrees. */
export const HEX_SYMMETRY = Math.PI / 3;

/**
 * How far to turn the artwork so its vertices land on this face's.
 *
 * Read off the polygon rather than off a board field, because `Board` does not
 * carry the hex orientation it was generated with -- and deriving it from the
 * corners means a board that was flipped, or laid out by some other generator
 * entirely, still gets art that lines up.
 *
 * The result is reduced to the shortest turn within one 60-degree step, so a
 * pointy-top board comes out at 0 and a flat-top one at 30 degrees. That is what
 * lets one master serve both orientations -- the same call the `board` family's
 * squiggle strip already makes by rotating per line rather than shipping a
 * vertical copy.
 */
export function hexRotation(face: Face): number {
  const [first] = face.corners;
  if (!first) return 0;
  const offset = Math.atan2(first.y - face.y, first.x - face.x) - HEX_ASSET_VERTEX_ANGLE;
  const turn = ((offset % HEX_SYMMETRY) + HEX_SYMMETRY) % HEX_SYMMETRY;
  // The epsilon is load-bearing. A flat-top board lands *exactly* on the
  // half-step, where floating-point noise otherwise sends some faces to +30
  // degrees and the rest to -30. Both draw an identical hexagon -- the shape is
  // 60-degree symmetric -- so a whole-outline style never notices. A half
  // outline does: the two turns keep different edges, and a board mixing them
  // tiles wrong. Biasing the comparison makes the whole board agree.
  return turn > HEX_SYMMETRY / 2 + 1e-9 ? turn - HEX_SYMMETRY : turn;
}

/**
 * The cell's circumradius, taken from the polygon so that a fitted or clamped
 * board scales the artwork with it. The master is cropped to its own bounding
 * box, which for a pointy-top hexagon is exactly `2R` tall -- so this is the
 * number the sprite's height is fitted to.
 */
export function faceRadius(face: Face): number {
  let radius = 0;
  for (const corner of face.corners) {
    radius = Math.max(radius, Math.hypot(corner.x - face.x, corner.y - face.y));
  }
  return radius;
}

/**
 * The arc of the `hex-half-solid` master that carries ink, measured in the
 * master's own frame (before {@link hexRotation} turns it onto a face).
 *
 * The half was cut along the line joining the upper-right vertex to the
 * lower-left one, keeping the left, upper-left and upper-right edges: a
 * continuous path whose three edge midpoints sit at 180, 240 and 300 degrees.
 * Anything whose midpoint falls outside 150..330 is on the erased side.
 */
const HEX_ART_KEPT_FROM = (150 * Math.PI) / 180;
const HEX_ART_KEPT_TO = (330 * Math.PI) / 180;

const TAU = Math.PI * 2;
const norm = (angle: number) => ((angle % TAU) + TAU) % TAU;

/** Midpoint of face edge `i`, which runs `corners[i] -> corners[i + 1]`. */
export function edgeMidpoint(face: Face, i: number): { x: number; y: number } {
  const a = face.corners[i];
  const b = face.corners[(i + 1) % face.corners.length];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Which of a face's six edges the half artwork actually draws.
 *
 * Worked out geometrically -- each edge midpoint is turned back into the
 * master's frame and tested against the kept arc -- rather than by hardcoding
 * indices. The indices happen to come out the same for pointy and flat boards,
 * but that is a consequence of how `hexRotation` aligns the art, not something
 * to rely on: a flipped or third-party lattice can wind its corners the other
 * way, and this follows it.
 */
export function keptEdges(face: Face): boolean[] {
  const rotation = hexRotation(face);
  return face.corners.map((_, i) => {
    const mid = edgeMidpoint(face, i);
    const inArt = norm(Math.atan2(mid.y - face.y, mid.x - face.x) - rotation);
    return inArt >= HEX_ART_KEPT_FROM - 1e-9 && inArt <= HEX_ART_KEPT_TO + 1e-9;
  });
}

const pointKey = (p: { x: number; y: number }) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
const edgeKey = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  [pointKey(a), pointKey(b)].sort().join('|');

/**
 * Faces that must also draw the complement half, by index into `board.faces`.
 *
 * One half per cell covers every *interior* edge exactly once -- each cell's
 * three erased edges are drawn by the three neighbours that share them. What it
 * cannot cover is an erased edge with no neighbour behind it, so half the
 * board's outline goes missing. These are the faces with at least one such edge.
 *
 * Drawing the whole complement there re-doubles any of that cell's other erased
 * edges that *do* have a neighbour. That is the cost of working in halves rather
 * than single edges, and it is confined to the boundary ring: 42 of 552 edges on
 * a size-8 Havannah board, against 462 doubled by drawing whole hexagons.
 */
export function complementFaces(board: Board): Set<number> {
  const shared = new Map<string, number>();
  for (const face of board.faces) {
    for (let i = 0; i < face.corners.length; i++) {
      const k = edgeKey(face.corners[i], face.corners[(i + 1) % face.corners.length]);
      shared.set(k, (shared.get(k) ?? 0) + 1);
    }
  }

  const needed = new Set<number>();
  board.faces.forEach((face, index) => {
    const kept = keptEdges(face);
    for (let i = 0; i < face.corners.length; i++) {
      if (kept[i]) continue;
      const k = edgeKey(face.corners[i], face.corners[(i + 1) % face.corners.length]);
      if (shared.get(k) === 1) {
        needed.add(index);
        return;
      }
    }
  });
  return needed;
}
