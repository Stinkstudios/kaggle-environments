import { describe, it, expect } from 'vitest';
import { squareLattice } from './square';
import { hexLattice } from './hex';
import { graphLattice } from './graph';

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

  it('mirrors both axes when asked, without moving any face off the board', () => {
    const plain = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 } });
    const flipped = squareLattice({
      cells: { rows: 8, cols: 8 },
      fit: { width: 512, height: 512 },
      flip: { x: true, y: true },
    });
    expect(flipped.faceAt([0, 0])!.x).toBeCloseTo(plain.faceAt([7, 7])!.x, 10);
    expect(flipped.faceAt([0, 0])!.y).toBeCloseTo(plain.faceAt([7, 7])!.y, 10);
    const positions = new Set(flipped.faces.map((face) => `${face.x.toFixed(6)},${face.y.toFixed(6)}`));
    expect(positions.size).toBe(plain.faces.length);
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
