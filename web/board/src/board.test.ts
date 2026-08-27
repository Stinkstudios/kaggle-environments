import { describe, it, expect } from 'vitest';
import { squareLattice } from './square';
import { hexLattice } from './hex';
import { graphLattice } from './graph';

describe('hitTest', () => {
  // The forward transform and the inverse have to stay consistent or every
  // playable visualizer built on this is subtly wrong. Round-tripping every
  // element is the cheapest way to keep them honest.
  it('round-trips every face of a square board', () => {
    const board = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 } });
    for (const face of board.faces) {
      expect(board.hitTest(face.x, face.y)?.element.coord).toEqual(face.coord);
    }
  });

  it('round-trips every point of a Go board', () => {
    const board = squareLattice({ points: { rows: 19, cols: 19 }, fit: { width: 512, height: 512, padding: 56 } });
    for (const point of board.points) {
      expect(board.hitTest(point.x, point.y)?.element.coord).toEqual(point.coord);
    }
  });

  it('round-trips every face of a hexagon board', () => {
    const board = hexLattice({ extent: 'hexagon', size: 8, fit: { width: 600, height: 600 } });
    for (const face of board.faces) {
      expect(board.hitTest(face.x, face.y)?.element.coord).toEqual(face.coord);
    }
  });

  it('defaults to the kind the board was generated for', () => {
    const chess = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 } });
    expect(chess.hitTest(10, 10)?.element.kind).toBe('face');

    const go = squareLattice({ points: { rows: 9, cols: 9 }, fit: { width: 512, height: 512, padding: 56 } });
    expect(go.hitTest(56, 56)?.element.kind).toBe('point');
  });

  it('finds the nearest edge when asked, which is how Dots & Boxes is played', () => {
    const board = squareLattice({ cells: { rows: 7, cols: 7 }, fit: { width: 700, height: 700 } });
    const target = board.edgeAt([3, 2, 'h'])!;
    const hit = board.hitTest(target.x + 4, target.y - 3, { kinds: ['edge'] });
    expect(hit?.element.coord).toEqual([3, 2, 'h']);
    expect(hit?.distance).toBeCloseTo(3, 10);
  });

  it('snaps a near miss to the closest point but gives up beyond half a pitch', () => {
    const board = squareLattice({ points: { rows: 9, cols: 9 }, fit: { width: 512, height: 512, padding: 56 } });
    const point = board.pointAt([4, 4])!;
    expect(board.hitTest(point.x + board.pitch * 0.4, point.y)?.element.coord).toEqual([4, 4]);
    expect(board.hitTest(point.x + board.pitch * 0.6, point.y - board.pitch * 0.6)).toBeNull();
  });

  it('misses cleanly outside the board', () => {
    const board = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 } });
    expect(board.hitTest(-50, -50)).toBeNull();
    expect(board.hitTest(9999, 9999)).toBeNull();
  });

  it('tries the requested kinds in order', () => {
    const board = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 } });
    const corner = board.pointAt([0, 0])!;
    expect(board.hitTest(corner.x, corner.y, { kinds: ['point', 'face'] })?.element.kind).toBe('point');
    expect(board.hitTest(corner.x + 1, corner.y + 1, { kinds: ['face', 'point'] })?.element.kind).toBe('face');
  });
});

describe('fitting', () => {
  it('centres the board in the box and reports its own extent', () => {
    const board = squareLattice({ cells: { rows: 4, cols: 8 }, fit: { width: 800, height: 800 } });
    expect(board.scale).toBe(100);
    expect(board.width).toBe(800);
    expect(board.height).toBe(400);
    expect(board.origin).toEqual({ x: 0, y: 200 });
  });

  it('keeps padding outside the board, which is where coordinate labels go', () => {
    const board = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512, padding: 56 } });
    expect(board.origin.x).toBe(56);
    expect(board.origin.x + board.width).toBe(512 - 56);
  });

  it('survives a box smaller than its padding without producing NaN', () => {
    const board = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 40, height: 40, padding: 56 } });
    expect(board.scale).toBe(0);
    expect(Number.isFinite(board.origin.x)).toBe(true);
    expect(Number.isFinite(board.pointAt([4, 4])!.x)).toBe(true);
  });

  it('degrades to unit space for a board with no extent on one axis', () => {
    // oshi_zumo is 1xN: there is no vertical extent to fit against.
    const board = squareLattice({ points: { rows: 1, cols: 9 }, fit: { width: 900, height: 200 } });
    expect(board.height).toBe(0);
    expect(board.width).toBeCloseTo(900, 10);
    expect(board.faces).toHaveLength(0);
  });
});

describe('flip', () => {
  it('mirrors about the board, leaving coords addressing the same piece', () => {
    const plain = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 } });
    const flipped = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 }, flip: { x: true } });
    expect(flipped.faceAt([0, 0])!.x).toBeCloseTo(plain.faceAt([0, 7])!.x, 10);
    expect(flipped.faceAt([0, 0])!.y).toBeCloseTo(plain.faceAt([0, 0])!.y, 10);
  });

  it('leaves the fitted extent unchanged', () => {
    const flipped = squareLattice({
      cells: { rows: 4, cols: 8 },
      fit: { width: 800, height: 800 },
      flip: { x: true, y: true },
    });
    expect(flipped.width).toBe(800);
    expect(flipped.origin).toEqual({ x: 0, y: 200 });
  });

  it('keeps hit-testing consistent with the flipped layout', () => {
    const board = squareLattice({
      cells: { rows: 8, cols: 8 },
      fit: { width: 512, height: 512 },
      flip: { x: true, y: true },
    });
    for (const face of board.faces) {
      expect(board.hitTest(face.x, face.y)?.element.coord).toEqual(face.coord);
    }
  });
});

describe('pitch', () => {
  it('scales with the board so radii and line widths can be derived from it', () => {
    const board = squareLattice({ points: { rows: 19, cols: 19 }, fit: { width: 512, height: 512, padding: 56 } });
    expect(board.pitch).toBeCloseTo((512 - 112) / 18, 10);
  });

  it('falls back to face spacing when a board has no edges', () => {
    const board = hexLattice({ extent: 'hexagon', size: 4, fit: { width: 400, height: 400 } });
    expect(board.pitch).toBeGreaterThan(0);
  });
});

describe('ids', () => {
  it('are unique across a board and stable between builds', () => {
    const build = () =>
      graphLattice({
        nodes: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
        segments: [
          [0, 1],
          [0, 2],
        ],
      });
    const first = build();
    const second = build();
    const ids = [...first.points, ...first.edges].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(second.points.map((p) => p.id)).toEqual(first.points.map((p) => p.id));
  });
});
