import { describe, expect, it } from 'vitest';
import { graphLattice } from './graph';
import { hexLattice } from './hex';
import { squareLattice } from './square';
import { latticeStrokes } from './strokes';
import type { Board } from './types';

/** Rounded and sorted, so assertions don't depend on Map iteration order. */
function normalize(board: Board) {
  return latticeStrokes(board)
    .map(({ a, b }) => [round(a.x), round(a.y), round(b.x), round(b.y)])
    .sort((left, right) => left.join(',').localeCompare(right.join(',')));
}

function round(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

describe('latticeStrokes', () => {
  it('merges a Go board into one run per line, not one per edge', () => {
    const board = squareLattice({ points: { rows: 19, cols: 19 } });

    // 19 rows x 18 spans + 19 cols x 18 spans = 684 edges, but 38 drawn lines.
    expect(board.edges).toHaveLength(684);
    expect(latticeStrokes(board)).toHaveLength(38);
  });

  it('spans each merged run end to end, on its own line', () => {
    const board = squareLattice({ points: { rows: 3, cols: 3 } });

    // Unit space: 3x3 intersections at 0..2 on both axes. Three rows and three
    // columns, each spanning the full width -- and each at a distinct offset,
    // which is what catches a merge that drops the perpendicular component and
    // collapses every parallel line onto the one through the origin.
    expect(normalize(board)).toEqual([
      [0, 0, 0, 2], // column x=0
      [0, 0, 2, 0], // row y=0
      [0, 1, 2, 1], // row y=1
      [0, 2, 2, 2], // row y=2
      [1, 0, 1, 2], // column x=1
      [2, 0, 2, 2], // column x=2
    ]);
  });

  it('carries the fit through, so strokes are in final coordinates', () => {
    const board = squareLattice({
      points: { rows: 19, cols: 19 },
      fit: { width: 512, height: 512, padding: 56 },
    });
    const strokes = normalize(board);

    // go's own constants: BOARD_PADDING 56, cell (512 - 2*56) / 18, so the
    // first line starts at 56 and the last ends at 456.
    expect(strokes).toContainEqual([56, 56, 56, 456]);
    expect(strokes).toContainEqual([56, 56, 456, 56]);
    expect(round(board.pitch)).toBe(round((512 - 56 * 2) / 18));
  });

  it('returns nothing for a hex board, which has no edges to stroke', () => {
    const board = hexLattice({ extent: 'hexagon', size: 4 });

    expect(board.edges).toHaveLength(0);
    expect(latticeStrokes(board)).toEqual([]);
  });

  it('merges collinear graph segments but keeps disjoint runs apart', () => {
    // 0-1 and 1-2 draw as one line; the unconnected pair further along the same
    // infinite line must not be swallowed into it.
    const board = graphLattice({
      nodes: [
        [0, 0],
        [1, 0],
        [2, 0],
        [4, 0],
        [5, 0],
      ],
      segments: [
        [0, 1],
        [1, 2],
        [3, 4],
      ],
    });

    expect(normalize(board)).toEqual([
      [0, 0, 2, 0],
      [4, 0, 5, 0],
    ]);
  });

  it('merges diagonals, not just axis-aligned runs', () => {
    const board = graphLattice({
      nodes: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      segments: [
        [0, 1],
        [1, 2],
      ],
    });

    expect(normalize(board)).toEqual([[0, 0, 2, 2]]);
  });

  it('treats a segment and its reverse as the same line', () => {
    const board = graphLattice({
      nodes: [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      // 1->0 runs backwards along the same line as 1->2.
      segments: [
        [1, 0],
        [1, 2],
      ],
    });

    expect(normalize(board)).toEqual([[0, 0, 2, 0]]);
  });
});
