import { describe, expect, it } from 'vitest';
import { hexLattice } from '@kaggle-environments/board';
import { complementFaces, faceRadius, HEX_ART_CENTRELINE_RATIO, HEX_ART_FIT, hexRotation, keptEdges } from './hex';

const DEGREES = 180 / Math.PI;

describe('hexRotation', () => {
  it('leaves a pointy-top board alone — the master is drawn pointy-top', () => {
    const board = hexLattice({ extent: 'hexagon', size: 4, orientation: 'pointy' });
    for (const face of board.faces) {
      expect(hexRotation(face) * DEGREES).toBeCloseTo(0);
    }
  });

  it('turns a flat-top board by 30 degrees, so one master serves both', () => {
    const board = hexLattice({ extent: 'hexagon', size: 4, orientation: 'flat' });
    for (const face of board.faces) {
      expect(Math.abs(hexRotation(face) * DEGREES)).toBeCloseTo(30);
    }
  });

  it('never turns further than half a step — 60 degrees is the identity', () => {
    for (const extent of ['rhombus', 'triangle'] as const) {
      const board =
        extent === 'rhombus'
          ? hexLattice({ extent, rows: 4, cols: 4 })
          : hexLattice({ extent, size: 5 });
      for (const face of board.faces) {
        expect(Math.abs(hexRotation(face))).toBeLessThanOrEqual(Math.PI / 6 + 1e-9);
      }
    }
  });

  it('follows a flipped board rather than a field the board does not carry', () => {
    const upright = hexLattice({ extent: 'hexagon', size: 3 });
    const flipped = hexLattice({ extent: 'hexagon', size: 3, flip: { y: true } });
    // A y-flip reflects the lattice but leaves each hexagon pointy-top, so the
    // artwork must not start turning to chase it.
    for (const face of flipped.faces) expect(hexRotation(face) * DEGREES).toBeCloseTo(0);
    expect(flipped.faces.length).toBe(upright.faces.length);
  });
});

describe('faceRadius', () => {
  it('scales with the board, so fitted and unit boards both size correctly', () => {
    const unit = hexLattice({ extent: 'hexagon', size: 3 });
    const fitted = hexLattice({ extent: 'hexagon', size: 3, fit: { width: 400, height: 400 } });

    expect(faceRadius(unit.faces[0])).toBeCloseTo(1);
    expect(faceRadius(fitted.faces[0])).toBeCloseTo(fitted.scale);
  });

  it('is the circumradius, not the inradius — every corner is the same distance out', () => {
    const board = hexLattice({ extent: 'hexagon', size: 2 });
    for (const face of board.faces) {
      for (const corner of face.corners) {
        expect(Math.hypot(corner.x - face.x, corner.y - face.y)).toBeCloseTo(faceRadius(face));
      }
    }
  });
});

describe('HEX_ART_FIT', () => {
  it('lands the drawn centreline exactly on the cell boundary', () => {
    const board = hexLattice({ extent: 'hexagon', size: 3, fit: { width: 400, height: 400 } });
    for (const face of board.faces) {
      const cell = faceRadius(face);
      // What the sprite actually draws: the canvas is fitted to the cell, then
      // the ink sits at CENTRELINE_RATIO of that, then `scale` corrects it.
      const drawn = cell * HEX_ART_CENTRELINE_RATIO * HEX_ART_FIT;
      expect(drawn).toBeCloseTo(cell, 6);
    }
  });

  it('is a correction upward — the uncorrected fit draws ~2.5% small', () => {
    expect(HEX_ART_FIT).toBeGreaterThan(1);
    expect(1 - HEX_ART_CENTRELINE_RATIO).toBeCloseTo(0.0246, 3);
  });
});

/**
 * What `drawFaceSprites` will actually put on the screen, counted per distinct
 * edge. The edge keys are derived independently of `hex.ts` on purpose: this is
 * the property the whole half-asset idea rests on, and a test that reused the
 * implementation's own keying could agree with it while both were wrong.
 */
function drawCounts(board: ReturnType<typeof hexLattice>, withComplement: boolean) {
  const k = (p: { x: number; y: number }) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
  const key = (a: { x: number; y: number }, b: { x: number; y: number }) => [k(a), k(b)].sort().join('|');

  const owners = new Map<string, number>();
  for (const face of board.faces) {
    for (let i = 0; i < 6; i++) {
      const e = key(face.corners[i], face.corners[(i + 1) % 6]);
      owners.set(e, (owners.get(e) ?? 0) + 1);
    }
  }

  const complement = withComplement ? complementFaces(board) : new Set<number>();
  const drawn = new Map<string, number>();
  board.faces.forEach((face, index) => {
    const kept = keptEdges(face);
    for (let i = 0; i < 6; i++) {
      if (!kept[i] && !complement.has(index)) continue;
      const e = key(face.corners[i], face.corners[(i + 1) % 6]);
      drawn.set(e, (drawn.get(e) ?? 0) + 1);
    }
  });

  return { owners, drawn };
}

const BOARDS = [
  ['hexagon, pointy', hexLattice({ extent: 'hexagon', size: 5 })],
  ['hexagon, flat', hexLattice({ extent: 'hexagon', size: 5, orientation: 'flat' })],
  ['rhombus, pointy', hexLattice({ extent: 'rhombus', rows: 6, cols: 6 })],
  ['rhombus, flat', hexLattice({ extent: 'rhombus', rows: 6, cols: 6, orientation: 'flat' })],
  ['triangle, pointy', hexLattice({ extent: 'triangle', size: 7 })],
  ['hexagon, y-flipped', hexLattice({ extent: 'hexagon', size: 5, flip: { y: true } })],
] as const;

describe('keptEdges', () => {
  it('covers exactly half of every cell', () => {
    for (const [label, board] of BOARDS) {
      for (const face of board.faces) {
        expect(keptEdges(face).filter(Boolean).length, label).toBe(3);
      }
    }
  });

  it('keeps three *contiguous* edges, so the brush is one unbroken run', () => {
    for (const [label, board] of BOARDS) {
      for (const face of board.faces) {
        const kept = keptEdges(face);
        // Walking the ring, a contiguous run of 3 flips between kept and
        // erased exactly twice.
        const flips = kept.filter((v, i) => v !== kept[(i + 5) % 6]).length;
        expect(flips, label).toBe(2);
      }
    }
  });
});

describe('half-hexagon tiling', () => {
  it('draws every interior edge exactly once — the whole point', () => {
    for (const [label, board] of BOARDS) {
      const { owners, drawn } = drawCounts(board, false);
      for (const [edge, n] of owners) {
        if (n === 2) expect(drawn.get(edge), `${label} interior`).toBe(1);
      }
      expect([...drawn.values()].filter((n) => n > 1), `${label} nothing doubled`).toEqual([]);
    }
  });

  it('leaves exactly half the outline open without the complement', () => {
    for (const [label, board] of BOARDS) {
      const { owners, drawn } = drawCounts(board, false);
      const boundary = [...owners].filter(([, n]) => n === 1);
      const missing = boundary.filter(([e]) => !drawn.has(e));
      expect(missing.length, label).toBe(boundary.length / 2);
    }
  });

  it('closes the outline with the complement, and doubles nothing beyond the ring', () => {
    for (const [label, board] of BOARDS) {
      const { owners, drawn } = drawCounts(board, true);
      for (const edge of owners.keys()) {
        expect(drawn.get(edge) ?? 0, `${label} covered`).toBeGreaterThanOrEqual(1);
      }
      // Doubling is confined to the boundary ring, so it is bounded by the
      // perimeter -- not by a tuned fraction of the board. Asserted structurally
      // as well: an edge may only be doubled if a complement face drew it.
      const boundary = [...owners.values()].filter((n) => n === 1).length;
      const doubledEdges = [...drawn].filter(([, n]) => n > 1).map(([e]) => e);
      expect(doubledEdges.length, `${label} bounded by the perimeter`).toBeLessThanOrEqual(boundary);

      const complement = complementFaces(board);
      const k = (p: { x: number; y: number }) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
      const key = (a: { x: number; y: number }, b: { x: number; y: number }) => [k(a), k(b)].sort().join('|');
      const reachable = new Set<string>();
      for (const index of complement) {
        const face = board.faces[index];
        for (let i = 0; i < 6; i++) reachable.add(key(face.corners[i], face.corners[(i + 1) % 6]));
      }
      for (const edge of doubledEdges) {
        expect(reachable.has(edge), `${label} doubling only where the complement drew`).toBe(true);
      }
    }
  });
});

describe('rotation stability', () => {
  it('gives every face on a board the same turn and the same kept edges', () => {
    // A flat-top board sits exactly on the reduction boundary, so this is where
    // an unbiased comparison splits one board across two different halves.
    for (const [label, board] of BOARDS) {
      const turns = new Set(board.faces.map((f) => Math.round(hexRotation(f) * 1e9) / 1e9 + 0));
      const patterns = new Set(board.faces.map((f) => keptEdges(f).join(',')));
      expect(turns.size, `${label} turn`).toBe(1);
      expect(patterns.size, `${label} kept edges`).toBe(1);
    }
  });
});
