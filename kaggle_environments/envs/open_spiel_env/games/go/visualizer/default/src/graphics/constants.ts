import type { FamilyInfo } from '@kaggle-environments/design-system-assets';
import goFamily from '@kaggle-environments/design-system-assets/go';
import boardFamily from '@kaggle-environments/design-system-assets/board';
import fxFamily from '@kaggle-environments/design-system-assets/fx';
import type { CellValue, GridPos } from '../types/game';

export const BOARD_PX = 512;
export const BOARD_PADDING = 56;

/** Star point (hoshi) positions per board size */
const STAR_POINTS: Record<number, [number, number][]> = {
  9: [
    [2, 2],
    [2, 6],
    [4, 4],
    [6, 2],
    [6, 6],
  ],
  13: [
    [3, 3],
    [3, 9],
    [6, 6],
    [9, 3],
    [9, 9],
  ],
  19: [
    [3, 3],
    [3, 9],
    [3, 15],
    [9, 3],
    [9, 9],
    [9, 15],
    [15, 3],
    [15, 9],
    [15, 15],
  ],
};

export function getStarPoints(boardSize: number): [number, number][] {
  return STAR_POINTS[boardSize] ?? [];
}

export function getCellSize(boardSize: number): number {
  return (BOARD_PX - BOARD_PADDING * 2) / (boardSize - 1);
}

const STONE_SCALE: Record<number, number> = {
  9: 0.8,
  13: 0.88,
  19: 0.88,
};

export function getStoneScale(boardSize: number): number {
  return STONE_SCALE[boardSize] ?? 0.88;
}

/** Map a board intersection (row, col) to pixel coordinates */
export function gridToPixel(row: number, col: number, boardSize: number): { x: number; y: number } {
  const cell = getCellSize(boardSize);
  return {
    x: BOARD_PADDING + col * cell,
    y: BOARD_PADDING + row * cell,
  };
}

const NEIGHBOR_DELTAS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/** Return orthogonal neighbors within board bounds */
export function getNeighbors(row: number, col: number, boardSize: number): GridPos[] {
  const neighbors: GridPos[] = [];
  for (const [dr, dc] of NEIGHBOR_DELTAS) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
      neighbors.push({ row: r, col: c });
    }
  }
  return neighbors;
}

/**
 * Asset families this visualizer loads at start-up.
 *
 * `go` is this game's own art — stones, markers and territory marks. `board`
 * carries the shared board furniture: the hand-drawn grid line moved there from
 * the `go` family, because board lines are not any one game's art and filing
 * them per-game is what kept other boards from reaching them.
 * `fx` is the shared particle family: the three capture puffs are byte-identical
 * to chess's, which is what earned them a place outside a game-scoped family.
 *
 * These are imported per-family on purpose. The package root is a barrel over
 * every family, so importing `pieceFamily` from it would bundle the chess set
 * and the 54-card deck into this visualizer — a megabyte of artwork no go board
 * ever draws. Naming each family as an import keeps the bundle honest: what you
 * see here is what ships.
 */
export const ASSET_FAMILIES: FamilyInfo[] = [goFamily, boardFamily, fxFamily];

/** Board cell values -> the colour prefix used in the shared asset id vocabulary. */
const COLOR_PREFIX: Record<Exclude<CellValue, '.'>, string> = { B: 'b', W: 'w' };

/**
 * Stable asset ids for the per-colour artwork, e.g. stoneId('B') -> 'go:b-stone'.
 * Renderers address artwork by id; filenames never appear in game code.
 */
export function stoneId(value: Exclude<CellValue, '.'>): string {
  return `go:${COLOR_PREFIX[value]}-stone`;
}

export function markerId(value: Exclude<CellValue, '.'>): string {
  return `go:${COLOR_PREFIX[value]}-marker`;
}

export function territoryId(value: Exclude<CellValue, '.'>): string {
  return `go:${COLOR_PREFIX[value]}-territory`;
}

/** Single-variant ids, named here so no module has to spell them by hand. */
export const SHADOW_ID = 'go:shadow';
export const HOSHI_ID = 'go:hoshi';
export const GRID_LINE_ID = 'board:squiggle-dash';

/** The shared capture-puff particles, drawn from at random on capture. */
export const PUFF_IDS = ['fx:puff1', 'fx:puff2', 'fx:puff3'] as const;
