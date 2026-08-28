import { describe, it, expect } from 'vitest';
import { squareLattice } from './square';
import { hexLattice } from './hex';
import type { BorderGroup } from './types';

const ids = (groups: readonly BorderGroup[]) => groups.map((group) => group.id);
const midpoints = (group: BorderGroup) => group.segments.map(([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));

describe('hexagon border — havannah', () => {
  // havannah/harness.py:32 — "Bridge: joining any 2 of the 6 corner cells.
  // Fork: touching any 3 of the 6 edges (corner cells do NOT count as edges)."
  const board = hexLattice({ extent: 'hexagon', size: 8, fit: { width: 600, height: 600 } });
  const radius = 7;

  it('has exactly 6 sides and 6 corners', () => {
    expect(ids(board.sides)).toEqual(['n', 'ne', 'se', 's', 'sw', 'nw']);
    expect(ids(board.corners)).toEqual(['nne', 'e', 'sse', 'ssw', 'w', 'nnw']);
  });

  it('puts one cell at each corner', () => {
    for (const corner of board.corners) expect(corner.elements).toHaveLength(1);
  });

  it('counts a corner cell as part of both sides it touches', () => {
    for (const corner of board.corners) {
      const cell = corner.elements[0];
      const touching = board.sides.filter((side) => side.elements.includes(cell));
      expect(touching).toHaveLength(2);
    }
  });

  it('leaves radius - 1 non-corner cells per side, which is what a fork counts', () => {
    const cornerCells = new Set(board.corners.flatMap((corner) => corner.elements));
    for (const side of board.sides) {
      expect(side.elements).toHaveLength(radius + 1);
      expect(side.elements.filter((cell) => !cornerCells.has(cell))).toHaveLength(radius - 1);
    }
  });

  it('covers 6 * radius distinct cells around the rim', () => {
    expect(new Set(board.sides.flatMap((side) => side.elements)).size).toBe(6 * radius);
  });
});

describe('rhombus border — hex', () => {
  // dark_hex/harness.py:125 — X connects TOP to BOTTOM, O connects LEFT to RIGHT.
  const board = hexLattice({ extent: 'rhombus', rows: 6, cols: 6, fit: { width: 600, height: 600 } });

  it('names the four sides so a game can ask for the ones it owns', () => {
    expect(ids(board.sides)).toEqual(['n', 'e', 's', 'w']);
    const north = board.sides.find((side) => side.id === 'n')!;
    const west = board.sides.find((side) => side.id === 'w')!;
    expect(north.elements).toHaveLength(6);
    expect(west.elements).toHaveLength(6);
  });

  it('shares each corner cell between the two sides that meet there', () => {
    const topLeft = board.faceAt([0, 0])!;
    const owning = board.sides.filter((side) => side.elements.includes(topLeft)).map((side) => side.id);
    expect(owning.sort()).toEqual(['n', 'w']);
  });
});

describe('triangle border — y', () => {
  const board = hexLattice({ extent: 'triangle', size: 8, fit: { width: 600, height: 600 } });

  it('has three sides and three corners', () => {
    expect(ids(board.sides)).toEqual(['n', 'se', 'sw']);
    expect(ids(board.corners)).toEqual(['nw', 'ne', 's']);
    for (const side of board.sides) expect(side.elements).toHaveLength(8);
  });
});

describe('outward segments', () => {
  // Every side carries the facets to stroke as a goal marker. The assignment is
  // the part that can silently go wrong: a corner cell's facets have to be split
  // between its two sides by which way each one actually faces.
  const board = hexLattice({ extent: 'rhombus', rows: 6, cols: 6, fit: { width: 600, height: 600 } });

  it('gives every side something to draw', () => {
    for (const side of board.sides) expect(side.segments.length).toBeGreaterThan(0);
  });

  it('never hands the same facet to two sides', () => {
    const keys = board.sides.flatMap((side) =>
      side.segments.map(([a, b]) =>
        [`${a.x.toFixed(4)},${a.y.toFixed(4)}`, `${b.x.toFixed(4)},${b.y.toFixed(4)}`].sort().join('|')
      )
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('puts north facets above south ones, and west left of east', () => {
    const north = midpoints(board.sides.find((side) => side.id === 'n')!);
    const south = midpoints(board.sides.find((side) => side.id === 's')!);
    const west = midpoints(board.sides.find((side) => side.id === 'w')!);
    const east = midpoints(board.sides.find((side) => side.id === 'e')!);

    expect(Math.max(...north.map((p) => p.y))).toBeLessThan(Math.min(...south.map((p) => p.y)));
    expect(Math.max(...west.map((p) => p.x))).toBeLessThan(Math.min(...east.map((p) => p.x)));
  });

  it('draws only true boundary facets, never an interior wall', () => {
    // An interior facet is shared by two cells, so its midpoint sits between two
    // face centres. A boundary facet has exactly one face within half a pitch.
    for (const side of board.sides) {
      for (const midpoint of midpoints(side)) {
        const near = board.faces.filter(
          (face) => Math.hypot(face.x - midpoint.x, face.y - midpoint.y) < board.pitch * 0.55
        );
        expect(near).toHaveLength(1);
      }
    }
  });
});

describe('square border', () => {
  it('works for cell-addressed boards', () => {
    const chess = squareLattice({ cells: { rows: 8, cols: 8 }, fit: { width: 512, height: 512 } });
    expect(ids(chess.sides)).toEqual(['n', 'e', 's', 'w']);
    for (const side of chess.sides) expect(side.elements).toHaveLength(8);
    expect(chess.corners.find((corner) => corner.id === 'ne')!.elements[0].coord).toEqual([0, 7]);
  });

  it('addresses intersections on point-sized boards, with no facets to stroke', () => {
    const go = squareLattice({ points: { rows: 19, cols: 19 } });
    expect(go.sides.find((side) => side.id === 'n')!.elements).toHaveLength(19);
    expect(go.sides.every((side) => side.segments.length === 0)).toBe(true);
  });
});

describe('border ids under flip', () => {
  // A compass id is a claim about where a side sits on screen, so flipping the
  // board has to mirror the names too -- otherwise `'n'` names the bottom edge.
  // havannah needs `flip: { y: true }`, so this is load-bearing, not cosmetic.
  const plain = hexLattice({ extent: 'hexagon', size: 5, fit: { width: 400, height: 400 } });
  const flipped = hexLattice({ extent: 'hexagon', size: 5, fit: { width: 400, height: 400 }, flip: { y: true } });

  it('mirrors north and south', () => {
    expect(ids(flipped.sides).sort()).toEqual(ids(plain.sides).sort());
    expect(ids(flipped.corners).sort()).toEqual(ids(plain.corners).sort());
  });

  it('keeps every named side on the screen edge its name claims', () => {
    for (const board of [plain, flipped]) {
      const north = midpoints(board.sides.find((side) => side.id === 'n')!);
      const south = midpoints(board.sides.find((side) => side.id === 's')!);
      expect(Math.max(...north.map((p) => p.y))).toBeLessThan(Math.min(...south.map((p) => p.y)));
    }
  });

  it('keeps corners on the screen edge their name claims', () => {
    for (const board of [plain, flipped]) {
      const west = board.corners.find((corner) => corner.id === 'w')!.elements[0];
      const east = board.corners.find((corner) => corner.id === 'e')!.elements[0];
      expect(west.x).toBeLessThan(east.x);
      const nne = board.corners.find((corner) => corner.id === 'nne')!.elements[0];
      const sse = board.corners.find((corner) => corner.id === 'sse')!.elements[0];
      expect(nne.y).toBeLessThan(sse.y);
    }
  });

  it('points a flipped group at the cell that is actually there', () => {
    // Unflipped, r = -radius is the top row. Flipped, that same row renders at
    // the bottom, so it must now be called 's'.
    expect(plain.sides.find((s) => s.id === 'n')!.elements).toContain(plain.faceAt([0, -4]));
    expect(flipped.sides.find((s) => s.id === 's')!.elements).toContain(flipped.faceAt([0, -4]));
  });
});

describe('face winding under flip', () => {
  // Mirroring one axis reverses polygon winding. Consumers that stroke a dashed
  // or gradient-filled outline depend on direction, so the winding a generator
  // chose has to survive `flip`.
  const signedArea = (corners: readonly { x: number; y: number }[]) =>
    corners.reduce((sum, corner, i) => {
      const next = corners[(i + 1) % corners.length];
      return sum + (corner.x * next.y - next.x * corner.y);
    }, 0);

  const plain = hexLattice({ extent: 'hexagon', size: 5, fit: { width: 400, height: 400 } });

  it('keeps the same winding when one axis is mirrored', () => {
    for (const flip of [{ y: true }, { x: true }]) {
      const flipped = hexLattice({ extent: 'hexagon', size: 5, fit: { width: 400, height: 400 }, flip });
      expect(Math.sign(signedArea(flipped.faceAt([0, 0])!.corners))).toBe(
        Math.sign(signedArea(plain.faceAt([0, 0])!.corners))
      );
    }
  });

  it('keeps it when both axes are mirrored, which is a rotation', () => {
    const rotated = hexLattice({
      extent: 'hexagon',
      size: 5,
      fit: { width: 400, height: 400 },
      flip: { x: true, y: true },
    });
    expect(Math.sign(signedArea(rotated.faceAt([0, 0])!.corners))).toBe(
      Math.sign(signedArea(plain.faceAt([0, 0])!.corners))
    );
  });

  it('holds for square boards too', () => {
    const flipped = squareLattice({ cells: { rows: 4, cols: 4 }, fit: { width: 400, height: 400 }, flip: { x: true } });
    const straight = squareLattice({ cells: { rows: 4, cols: 4 }, fit: { width: 400, height: 400 } });
    expect(Math.sign(signedArea(flipped.faceAt([0, 0])!.corners))).toBe(
      Math.sign(signedArea(straight.faceAt([0, 0])!.corners))
    );
  });
});

describe('border segments survive a flip', () => {
  // Reversing winding without reversing the vertex ids alongside it would leave
  // each facet's endpoints paired with the wrong corners -- adjacency would still
  // look fine while every drawn goal marker silently moved.
  const board = hexLattice({ extent: 'hexagon', size: 5, fit: { width: 400, height: 400 }, flip: { y: true } });

  it('still emits only true boundary facets', () => {
    for (const side of board.sides) {
      for (const [a, b] of side.segments) {
        const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const near = board.faces.filter(
          (face) => Math.hypot(face.x - midpoint.x, face.y - midpoint.y) < board.pitch * 0.55
        );
        expect(near).toHaveLength(1);
      }
    }
  });

  it('still gives every facet the length of a cell side', () => {
    const expected = board.pitch / Math.sqrt(3);
    for (const side of board.sides) {
      for (const [a, b] of side.segments) expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(expected, 6);
    }
  });
});
