import { createBoard, type UnitEdge, type UnitFace, type UnitPoint } from './board';
import type { Board, Coord, Fit, Flip } from './types';

export interface LatticeOptions {
  fit?: Fit;
  flip?: Flip;
}

export interface Dimensions {
  rows: number;
  cols: number;
}

/**
 * A square lattice, sized either by its cells or by its intersections.
 *
 * The two spellings exist because Chess and Go genuinely disagree about what
 * "19x19" or "8x8" counts, and hiding that disagreement inside a +/-1 is exactly
 * how off-by-one bugs get written:
 *
 * ```ts
 * squareLattice({ cells: { rows: 8, cols: 8 } })     // Chess: 8x8 squares, 9x9 corners
 * squareLattice({ points: { rows: 19, cols: 19 } })  // Go: 19x19 intersections, 18x18 cells
 * squareLattice({ cells: { rows: 7, cols: 7 } })     // Dots & Boxes: 7x7 boxes, 8x8 dots
 * ```
 *
 * All three get points, edges and faces; they differ only in which they read.
 * `primary` follows the spelling used, so `hitTest` defaults to the right thing.
 */
export type SquareLatticeOptions = LatticeOptions & ({ cells: Dimensions } | { points: Dimensions });

export function squareLattice(options: SquareLatticeOptions): Board {
  const sizedByCells = 'cells' in options;
  const declared = sizedByCells ? options.cells : options.points;

  if (!Number.isInteger(declared.rows) || !Number.isInteger(declared.cols) || declared.rows < 1 || declared.cols < 1) {
    throw new Error(
      `squareLattice needs positive integer rows and cols, got ${declared.rows}x${declared.cols}. ` +
        `Note that \`cells\` counts squares and \`points\` counts intersections.`
    );
  }

  const pointRows = sizedByCells ? declared.rows + 1 : declared.rows;
  const pointCols = sizedByCells ? declared.cols + 1 : declared.cols;

  const points: UnitPoint[] = [];
  for (let row = 0; row < pointRows; row++) {
    for (let col = 0; col < pointCols; col++) {
      points.push({ coord: [row, col], x: col, y: row });
    }
  }

  // Edge coords are `[row, col, 'h' | 'v']` where the row/col is the point the
  // edge runs *from*. That lines up one-to-one with the `h_lines[r][c]` /
  // `v_lines[r][c]` arrays Dots & Boxes already emits.
  const edges: UnitEdge[] = [];
  for (let row = 0; row < pointRows; row++) {
    for (let col = 0; col < pointCols - 1; col++) {
      edges.push({ coord: [row, col, 'h'], a: [row, col], b: [row, col + 1] });
    }
  }
  for (let row = 0; row < pointRows - 1; row++) {
    for (let col = 0; col < pointCols; col++) {
      edges.push({ coord: [row, col, 'v'], a: [row, col], b: [row + 1, col] });
    }
  }

  const faces: UnitFace[] = [];
  for (let row = 0; row < pointRows - 1; row++) {
    for (let col = 0; col < pointCols - 1; col++) {
      faces.push({
        coord: [row, col],
        corners: [
          { x: col, y: row },
          { x: col + 1, y: row },
          { x: col + 1, y: row + 1 },
          { x: col, y: row + 1 },
        ],
      });
    }
  }

  // Border groups address whichever element kind the board plays on: cells for
  // a Chess-style board, intersections for a Go-style one.
  const lastRow = (sizedByCells ? pointRows - 1 : pointRows) - 1;
  const lastCol = (sizedByCells ? pointCols - 1 : pointCols) - 1;
  const along = (pick: (index: number) => Coord, count: number) =>
    Array.from({ length: count }, (_, index) => pick(index));

  const border = {
    sides: [
      { id: 'n', coords: along((col) => [0, col], lastCol + 1) },
      { id: 'e', coords: along((row) => [row, lastCol], lastRow + 1) },
      { id: 's', coords: along((col) => [lastRow, col], lastCol + 1) },
      { id: 'w', coords: along((row) => [row, 0], lastRow + 1) },
    ],
    corners: [
      { id: 'nw', coords: [[0, 0] as Coord] },
      { id: 'ne', coords: [[0, lastCol] as Coord] },
      { id: 'se', coords: [[lastRow, lastCol] as Coord] },
      { id: 'sw', coords: [[lastRow, 0] as Coord] },
    ],
  };

  return createBoard({ primary: sizedByCells ? 'face' : 'point', points, edges, faces, border }, options);
}
