import type { Face } from '@kaggle-environments/board';

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
  return turn > HEX_SYMMETRY / 2 ? turn - HEX_SYMMETRY : turn;
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
