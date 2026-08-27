import { describe, it, expect } from 'vitest';
import { hexLattice } from './hex';

const SQRT3 = Math.sqrt(3);

describe('hexLattice extents', () => {
  // Extent is the axis the four hex games in this repo actually differ on.
  it('cuts a rhombus for dark_hex', () => {
    const board = hexLattice({ extent: 'rhombus', rows: 11, cols: 11 });
    expect(board.faces).toHaveLength(121);
  });

  it('cuts a hexagon for havannah, sized by base length', () => {
    // Base 8 -> radius 7 -> 3r^2 + 3r + 1 = 169 cells.
    const board = hexLattice({ extent: 'hexagon', size: 8 });
    expect(board.faces).toHaveLength(169);
    expect(board.faceAt([0, 0])).not.toBeNull();
    expect(board.faceAt([7, 7])).toBeNull();
  });

  it('cuts a triangle for y', () => {
    const board = hexLattice({ extent: 'triangle', size: 8 });
    expect(board.faces).toHaveLength((8 * 9) / 2);
  });

  it('emits faces only -- a hex grid has no intersections to play on', () => {
    const board = hexLattice({ extent: 'hexagon', size: 4 });
    expect(board.points).toHaveLength(0);
    expect(board.edges).toHaveLength(0);
    expect(board.primary).toBe('face');
  });

  it('rejects sizes that cannot describe a board', () => {
    expect(() => hexLattice({ extent: 'hexagon', size: 0 })).toThrow(/positive integer/);
  });
});

describe('hexLattice orientation', () => {
  it('is pointy-top by default, which is what all four hex games use', () => {
    const board = hexLattice({ extent: 'rhombus', rows: 3, cols: 3 });
    const corners = board.faceAt([1, 1])!.corners;
    const centre = board.faceAt([1, 1])!;
    // Pointy-top puts two corners on the vertical through the centre.
    const vertical = corners.filter((corner) => Math.abs(corner.x - centre.x) < 1e-9);
    expect(vertical).toHaveLength(2);
  });

  it('rotates the hexagon but not the lattice when flat-top', () => {
    const board = hexLattice({ extent: 'rhombus', rows: 3, cols: 3, orientation: 'flat' });
    const centre = board.faceAt([1, 1])!;
    const horizontal = centre.corners.filter((corner) => Math.abs(corner.y - centre.y) < 1e-9);
    expect(horizontal).toHaveLength(2);
  });

  it('spaces pointy-top neighbours sqrt(3) apart in unit space', () => {
    const board = hexLattice({ extent: 'rhombus', rows: 3, cols: 3 });
    expect(board.pitch).toBeCloseTo(SQRT3, 10);
  });
});

describe('hexLattice adjacency', () => {
  // Every hex game here is a connection game, so face adjacency is the feature,
  // and it has to hold up against floating-point corner positions.
  const board = hexLattice({ extent: 'hexagon', size: 8 });

  it('gives an interior cell six neighbours', () => {
    expect(board.neighborsOf(board.faceAt([0, 0])!)).toHaveLength(6);
  });

  it('gives a hexagon corner cell three neighbours and an edge cell four', () => {
    expect(board.neighborsOf(board.faceAt([7, 0])!)).toHaveLength(3);
    expect(board.neighborsOf(board.faceAt([7, -3])!)).toHaveLength(4);
  });

  it('is symmetric across the whole board', () => {
    for (const face of board.faces) {
      for (const neighbour of board.neighborsOf(face)) {
        expect(board.neighborsOf(neighbour as never)).toContain(face);
      }
    }
  });

  it('never reports more than six neighbours anywhere', () => {
    const counts = board.faces.map((face) => board.neighborsOf(face).length);
    expect(Math.max(...counts)).toBe(6);
    expect(Math.min(...counts)).toBe(3);
  });
});

describe('hexLattice fitting', () => {
  it('reports the extent the board actually occupies, not the box it sits in', () => {
    const unit = hexLattice({ extent: 'triangle', size: 8 });
    const fitted = hexLattice({ extent: 'triangle', size: 8, fit: { width: 800, height: 400 } });

    // The box is far wider than the board, so height is the binding axis and
    // the leftover width is slack -- not part of the board.
    expect(fitted.height).toBeCloseTo(400, 10);
    expect(fitted.width).toBeLessThan(800);
    expect(fitted.origin.y).toBeCloseTo(0, 10);
    expect(fitted.origin.x).toBeCloseTo((800 - fitted.width) / 2, 10);

    // Aspect comes from the board, not the box: an off-square extent is never
    // stretched to fill, which is the dead-space problem this replaces.
    expect(fitted.width / fitted.height).toBeCloseTo(unit.width / unit.height, 10);
  });
});
