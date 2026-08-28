import { describe, it, expect } from 'vitest';
import { diffOccupancy, occupancyFromGrid, occupancyFromList } from './diff';
import { coordKey } from './types';

const grid = (rows: string[]) =>
  occupancyFromGrid(
    rows.map((row) => row.split('')),
    (cell) => cell === '.'
  );

describe('occupancyFromGrid', () => {
  it('keys by the same coord a square lattice addresses points and faces with', () => {
    const occupancy = grid(['.B.', 'W..']);
    expect(occupancy.get(coordKey([0, 1]))).toEqual({ key: '0,1', coord: [0, 1], value: 'B' });
    expect(occupancy.get(coordKey([1, 0]))).toEqual({ key: '1,0', coord: [1, 0], value: 'W' });
    expect(occupancy.size).toBe(2);
  });
});

describe('occupancyFromList', () => {
  it('keys a flat board by the index graphLattice addresses its points with', () => {
    // Nine Men's Morris emits board[24], not board[r][c].
    const occupancy = occupancyFromList(['W', '.', 'B'], (cell) => cell === '.');
    expect(occupancy.get(coordKey([0]))).toEqual({ key: '0', coord: [0], value: 'W' });
    expect(occupancy.get(coordKey([2]))).toEqual({ key: '2', coord: [2], value: 'B' });
    expect(occupancy.size).toBe(2);
  });

  it('pairs a slide across a graph board into one move', () => {
    const diff = diffOccupancy(
      occupancyFromList(['W', '.', '.'], (c) => c === '.'),
      occupancyFromList(['.', '.', 'W'], (c) => c === '.'),
      { detectMoves: true }
    );
    expect(diff.moved).toEqual([{ from: [0], to: [2], value: 'W' }]);
  });
});

describe('diffOccupancy', () => {
  it('reports a placement', () => {
    const diff = diffOccupancy(grid(['...']), grid(['.B.']));
    expect(diff.added).toEqual([{ key: '0,1', coord: [0, 1], value: 'B' }]);
    expect(diff.removed).toHaveLength(0);
  });

  it('reports a Go capture as a removal, not a move', () => {
    const diff = diffOccupancy(grid(['WB.']), grid(['.B.']));
    expect(diff.removed).toEqual([{ key: '0,0', coord: [0, 0], value: 'W' }]);
    expect(diff.moved).toHaveLength(0);
  });

  it('reports an Othello flip as a change in place', () => {
    const diff = diffOccupancy(grid(['WB.']), grid(['BB.']));
    expect(diff.changed).toEqual([{ key: '0,0', coord: [0, 0], from: 'W', to: 'B' }]);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('treats a null previous state as an empty board, for step zero', () => {
    const diff = diffOccupancy(null, grid(['WB.']));
    expect(diff.added).toHaveLength(2);
  });

  it('leaves moves unpaired unless asked, because captures are not moves', () => {
    const diff = diffOccupancy(grid(['W..']), grid(['..W']));
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(1);
    expect(diff.moved).toHaveLength(0);
  });

  it('reports the coord, not just the key, because keys cannot be parsed back', () => {
    // coordKey is one-way, so a consumer that has to redraw at (row, col) --
    // which is every consumer -- needs the coord handed back to it.
    const diff = diffOccupancy(grid(['...']), grid(['..B']));
    expect(diff.added[0].coord).toEqual([0, 2]);
  });

  it('pairs a slide into a single move when asked', () => {
    // Nine Men's Morris movement phase: one man leaves a point and arrives at another.
    const diff = diffOccupancy(grid(['W..']), grid(['..W']), { detectMoves: true });
    expect(diff.moved).toEqual([{ from: [0, 0], to: [0, 2], value: 'W' }]);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('only pairs like with like, so a move plus a capture stays legible', () => {
    // White slides; Black is taken off the board in the same step.
    const diff = diffOccupancy(grid(['WB.']), grid(['..W']), { detectMoves: true });
    expect(diff.moved).toEqual([{ from: [0, 0], to: [0, 2], value: 'W' }]);
    expect(diff.removed).toEqual([{ key: '0,1', coord: [0, 1], value: 'B' }]);
    expect(diff.added).toHaveLength(0);
  });
});
