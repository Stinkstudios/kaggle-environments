import { describe, expect, it } from 'vitest';
import { hexLattice } from '@kaggle-environments/board';
import { faceRadius, HEX_ART_CENTRELINE_RATIO, HEX_ART_FIT, hexRotation } from './hex';

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
