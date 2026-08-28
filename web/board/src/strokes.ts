import type { Board, Vec2 } from './types';

/** A maximal straight run of the lattice, in the board's final coordinates. */
export interface Stroke {
  a: Vec2;
  b: Vec2;
}

/**
 * The lattice's edges merged into maximal straight runs.
 *
 * A 19x19 Go board emits 684 unit-length edges, but the board people draw has
 * 38 lines. A flat stroke looks identical either way, so this would be
 * pointless if that were the only consumer -- it is not. `go` draws each line
 * as a `TilingSprite` of a brush-stroke texture, and 684 sprites would restart
 * the brush at every intersection and leave a seam there. Handing back the runs
 * lets a textured renderer place one sprite per line.
 *
 * Renderer-agnostic, and deliberately here rather than in a drawing package:
 * `nine_mens_morris`'s Canvas2D renderer hand-rolls exactly this as its own
 * `deriveLines`, and it cannot reach a version that lives behind a Pixi import.
 * `design-system-board-renderer`'s `drawGrid` is a thin wrapper over it.
 *
 * Returns an empty array for a face-only board (any hex lattice) -- those have
 * no edges, and their outlines come from {@link drawFaces} instead.
 */
export function latticeStrokes(board: Board): Stroke[] {
  // Board coordinates are post-`fit`, so tolerances have to scale with the
  // board. `pitch` is the median gap between adjacent elements; in unit space
  // it is 1, which is what the tests see.
  const epsilon = (board.pitch || 1) * 1e-6;
  const quantize = (value: number) => Math.round(value / epsilon);

  // Group edges by the infinite line they lie on: a normal plus that line's
  // signed distance from the origin. The direction is canonicalised first so
  // that an edge and its reverse land in the same group.
  const lines = new Map<string, { dir: Vec2; offset: number; segments: Array<{ min: number; max: number }> }>();

  for (const edge of board.edges) {
    let dx = edge.b.x - edge.a.x;
    let dy = edge.b.y - edge.a.y;
    const length = Math.hypot(dx, dy);
    if (length <= epsilon) continue;

    dx /= length;
    dy /= length;
    // Canonical direction: point into the +x half-plane, or +y when vertical.
    if (dx < -epsilon || (Math.abs(dx) <= epsilon && dy < 0)) {
      dx = -dx;
      dy = -dy;
    }

    // Normal to the direction, and the line's offset along it.
    const offset = -dy * edge.a.x + dx * edge.a.y;
    const key = `${quantize(dx)}:${quantize(dy)}:${quantize(offset)}`;

    // Position along the line, so overlapping runs can be merged in 1D.
    const ta = dx * edge.a.x + dy * edge.a.y;
    const tb = dx * edge.b.x + dy * edge.b.y;

    const line = lines.get(key);
    const segment = { min: Math.min(ta, tb), max: Math.max(ta, tb) };
    if (line) line.segments.push(segment);
    else lines.set(key, { dir: { x: dx, y: dy }, offset, segments: [segment] });
  }

  const strokes: Stroke[] = [];

  for (const { dir, offset, segments } of lines.values()) {
    segments.sort((left, right) => left.min - right.min);

    // (dir, normal) is an orthonormal basis, so a point on the line is
    // recovered from its two components: dir*t along it, normal*offset across.
    const normal = { x: -dir.y, y: dir.x };
    const at = (t: number): Vec2 => ({ x: dir.x * t + normal.x * offset, y: dir.y * t + normal.y * offset });

    let { min, max } = segments[0];
    const flush = () => strokes.push({ a: at(min), b: at(max) });

    for (let index = 1; index < segments.length; index++) {
      const segment = segments[index];
      // Touching counts as contiguous -- consecutive lattice edges share an
      // endpoint exactly, which is the whole reason for merging.
      if (segment.min <= max + epsilon) {
        if (segment.max > max) max = segment.max;
        continue;
      }
      flush();
      min = segment.min;
      max = segment.max;
    }
    flush();
  }

  return strokes;
}
