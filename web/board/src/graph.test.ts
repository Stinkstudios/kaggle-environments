import { describe, it, expect } from 'vitest';
import { graphLattice } from './graph';

// Copied from nine_mens_morris/…/renderer.ts: the 24 points squashed onto a 7x7
// grid. If porting that board is not close to mechanical, the irregular case is
// the wrong shape.
const MORRIS_NODES: Array<[number, number]> = [
  [0, 0],
  [3, 0],
  [6, 0],
  [1, 1],
  [3, 1],
  [5, 1],
  [2, 2],
  [3, 2],
  [4, 2],
  [0, 3],
  [1, 3],
  [2, 3],
  [4, 3],
  [5, 3],
  [6, 3],
  [2, 4],
  [3, 4],
  [4, 4],
  [1, 5],
  [3, 5],
  [5, 5],
  [0, 6],
  [3, 6],
  [6, 6],
];

// The renderer stores four long strokes per square because it only draws them.
// Adjacency needs the fine-grained links, so these are the same lines split at
// every point they pass through.
const MORRIS_SEGMENTS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 14],
  [14, 23],
  [23, 22],
  [22, 21],
  [21, 9],
  [9, 0],
  [3, 4],
  [4, 5],
  [5, 13],
  [13, 20],
  [20, 19],
  [19, 18],
  [18, 10],
  [10, 3],
  [6, 7],
  [7, 8],
  [8, 12],
  [12, 17],
  [17, 16],
  [16, 15],
  [15, 11],
  [11, 6],
  [1, 4],
  [4, 7],
  [9, 10],
  [10, 11],
  [12, 13],
  [13, 14],
  [16, 19],
  [19, 22],
];

describe('graphLattice', () => {
  const board = graphLattice({ nodes: MORRIS_NODES, segments: MORRIS_SEGMENTS });

  it('makes every hand-placed node a point and every segment an edge', () => {
    expect(board.points).toHaveLength(24);
    expect(board.edges).toHaveLength(32);
    expect(board.faces).toHaveLength(0);
    expect(board.primary).toBe('point');
  });

  it('addresses points by index', () => {
    expect(board.pointAt([0])).toMatchObject({ x: 0, y: 0 });
    expect(board.pointAt([23])).toMatchObject({ x: 6, y: 6 });
    expect(board.pointAt([24])).toBeNull();
  });

  it("reproduces Nine Men's Morris adjacency", () => {
    // Outer corner: along the top edge and down the left.
    expect(
      board
        .neighborsOf(board.pointAt([0])!)
        .map((p) => p.coord[0])
        .sort()
    ).toEqual([1, 9]);
    // Midpoint of the middle square's top edge: along its own square, plus the
    // cross line running to both the outer and inner squares.
    expect(
      board
        .neighborsOf(board.pointAt([4])!)
        .map((p) => p.coord[0])
        .sort()
    ).toEqual([1, 3, 5, 7]);
    // The centre of the board is not a point at all in this game.
    expect(board.points.some((point) => point.x === 3 && point.y === 3)).toBe(false);
  });

  it('fits the hand-placed coordinates like any other lattice', () => {
    const fitted = graphLattice({
      nodes: MORRIS_NODES,
      segments: MORRIS_SEGMENTS,
      fit: { width: 400, height: 400, padding: 20 },
    });
    expect(fitted.scale).toBeCloseTo((400 - 40) / 6, 10);
    expect(fitted.pointAt([0])).toMatchObject({ x: 20, y: 20 });
    expect(fitted.pointAt([23])).toMatchObject({ x: 380, y: 380 });
  });

  it('rejects a segment pointing at a node that does not exist', () => {
    expect(() =>
      graphLattice({
        nodes: [
          [0, 0],
          [1, 0],
        ],
        segments: [[0, 5]],
      })
    ).toThrow(/outside 0\.\.1/);
  });
});
