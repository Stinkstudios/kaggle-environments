import { describe, it, expect } from 'vitest';
import { squareLattice } from './square';

describe('squareLattice sizing', () => {
  it('counts squares when sized by cells, and gives them a fencepost of points', () => {
    const board = squareLattice({ cells: { rows: 8, cols: 8 } });
    expect(board.faces).toHaveLength(64);
    expect(board.points).toHaveLength(81);
    expect(board.primary).toBe('face');
  });

  it('counts intersections when sized by points, and gives them one fewer cell per axis', () => {
    const board = squareLattice({ points: { rows: 19, cols: 19 } });
    expect(board.points).toHaveLength(361);
    expect(board.faces).toHaveLength(324);
    expect(board.primary).toBe('point');
  });

  it('supports non-square boards', () => {
    const connectFour = squareLattice({ cells: { rows: 6, cols: 7 } });
    expect(connectFour.faces).toHaveLength(42);
    expect(connectFour.faceAt([5, 6])).not.toBeNull();
    expect(connectFour.faceAt([6, 5])).toBeNull();
  });

  it('rejects sizes that cannot describe a board', () => {
    expect(() => squareLattice({ cells: { rows: 0, cols: 8 } })).toThrow(/positive integer/);
    expect(() => squareLattice({ points: { rows: 8, cols: 2.5 } })).toThrow(/positive integer/);
  });
});

describe('squareLattice unit space', () => {
  it('places one lattice step per unit with the top-left at the origin', () => {
    const board = squareLattice({ cells: { rows: 8, cols: 8 } });
    expect(board.scale).toBe(1);
    expect(board.origin).toEqual({ x: 0, y: 0 });
    expect(board.width).toBe(8);
    expect(board.height).toBe(8);
    expect(board.pitch).toBe(1);
    expect(board.pointAt([0, 0])).toMatchObject({ x: 0, y: 0 });
    expect(board.pointAt([3, 5])).toMatchObject({ x: 5, y: 3 });
    expect(board.faceAt([0, 0])).toMatchObject({ x: 0.5, y: 0.5 });
  });
});

describe('squareLattice edges', () => {
  // Dots & Boxes emits `h_lines[r][c]` (rows+1 by cols) and `v_lines[r][c]`
  // (rows by cols+1). Edge coords have to line up with those arrays exactly, or
  // every consumer pays an index-translation tax.
  const board = squareLattice({ cells: { rows: 7, cols: 7 } });

  it('produces one edge per h_lines / v_lines entry', () => {
    const horizontal = board.edges.filter((edge) => edge.coord[2] === 'h');
    const vertical = board.edges.filter((edge) => edge.coord[2] === 'v');
    expect(horizontal).toHaveLength(8 * 7);
    expect(vertical).toHaveLength(7 * 8);
  });

  it('runs h edges rightward and v edges downward from their named point', () => {
    expect(board.edgeAt([0, 0, 'h'])).toMatchObject({ a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, angle: 0, length: 1 });
    expect(board.edgeAt([0, 0, 'v'])).toMatchObject({ a: { x: 0, y: 0 }, b: { x: 0, y: 1 }, length: 1 });
    expect(board.edgeAt([0, 0, 'v'])?.angle).toBeCloseTo(Math.PI / 2, 10);
  });

  it('has no edge past the last line in each direction', () => {
    expect(board.edgeAt([7, 6, 'h'])).not.toBeNull();
    expect(board.edgeAt([7, 7, 'h'])).toBeNull();
    expect(board.edgeAt([6, 7, 'v'])).not.toBeNull();
    expect(board.edgeAt([7, 7, 'v'])).toBeNull();
  });
});

describe('squareLattice reproduces the geometry the shipped visualizers compute by hand', () => {
  it("matches go's gridToPixel exactly", () => {
    // go/…/graphics/constants.ts: BOARD_PX 512, BOARD_PADDING 56,
    // getCellSize = (512 - 112) / (19 - 1), gridToPixel = 56 + col * cell.
    const board = squareLattice({ points: { rows: 19, cols: 19 }, fit: { width: 512, height: 512, padding: 56 } });
    const cell = (512 - 56 * 2) / 18;

    expect(board.scale).toBeCloseTo(cell, 10);
    for (const [row, col] of [
      [0, 0],
      [3, 15],
      [18, 18],
    ] as const) {
      expect(board.pointAt([row, col])).toMatchObject({
        x: expect.closeTo(56 + col * cell, 10),
        y: expect.closeTo(56 + row * cell, 10),
      });
    }
  });

  it("matches chess's squareToPixel exactly, in both orientations", () => {
    // chess/…/graphics/coordinates.ts, squareSize 64, offset 0. Square "e4" is
    // boardCol 4, boardRow 3; White sees screenRow 7 - 3.
    const white = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 } });
    expect(white.faceAt([4, 4])).toMatchObject({ x: 4 * 64 + 32, y: 4 * 64 + 32 });

    // Black's view is the same board flipped on both axes.
    const black = squareLattice({
      cells: { rows: 8, cols: 8 },
      fit: { width: 512, height: 512 },
      flip: { x: true, y: true },
    });
    expect(black.faceAt([4, 4])).toMatchObject({ x: 3 * 64 + 32, y: 3 * 64 + 32 });
  });

  it("matches dots_and_boxes's fitting block, minimum-cell clamp included", () => {
    // dots_and_boxes/…/renderer.ts: padding 32, cellSize = max(12, min(innerW/cols, innerH/rows)),
    // originX = (width - cols * cellSize) / 2.
    const board = squareLattice({
      cells: { rows: 7, cols: 7 },
      fit: { width: 800, height: 600, padding: 32, minScale: 12 },
    });
    const cellSize = Math.max(12, Math.min((800 - 64) / 7, (600 - 64) / 7));

    expect(board.scale).toBeCloseTo(cellSize, 10);
    expect(board.origin.x).toBeCloseTo((800 - 7 * cellSize) / 2, 10);
    expect(board.origin.y).toBeCloseTo((600 - 7 * cellSize) / 2, 10);
    expect(board.pointAt([3, 2])).toMatchObject({
      x: expect.closeTo(board.origin.x + 2 * cellSize, 10),
      y: expect.closeTo(board.origin.y + 3 * cellSize, 10),
    });
  });

  it('honours the minimum-cell clamp even when that overflows the box', () => {
    const board = squareLattice({ cells: { rows: 40, cols: 40 }, fit: { width: 100, height: 100, minScale: 12 } });
    expect(board.scale).toBe(12);
    expect(board.width).toBe(480);
    expect(board.origin.x).toBe((100 - 480) / 2);
  });
});

describe('squareLattice adjacency', () => {
  const go = squareLattice({ points: { rows: 19, cols: 19 } });

  it('gives interior points four neighbours and corners two', () => {
    expect(go.neighborsOf(go.pointAt([9, 9])!)).toHaveLength(4);
    expect(go.neighborsOf(go.pointAt([0, 0])!)).toHaveLength(2);
    expect(go.neighborsOf(go.pointAt([0, 9])!)).toHaveLength(3);
  });

  it('gives faces their four orthogonal neighbours', () => {
    const chess = squareLattice({ cells: { rows: 8, cols: 8 } });
    expect(chess.neighborsOf(chess.faceAt([4, 4])!)).toHaveLength(4);
    expect(chess.neighborsOf(chess.faceAt([0, 0])!)).toHaveLength(2);
  });
});
