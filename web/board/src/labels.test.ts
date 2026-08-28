import { describe, expect, it } from 'vitest';
import { squareLattice } from './square';
import { GO_COLUMN_LETTERS, labelPlacements } from './labels';
import type { Element } from './types';

const isColumnSide = (side: string) => side === 'n' || side === 's';

describe('labelPlacements', () => {
  it("reproduces go's placement, anchored to the board extent", () => {
    // go: BOARD_PX 512, BOARD_PADDING 56, labels at BOARD_PADDING * 0.45.
    const board = squareLattice({
      points: { rows: 19, cols: 19 },
      fit: { width: 512, height: 512, padding: 56 },
    });

    const placements = labelPlacements(board, {
      offset: 56 * 0.45,
      text: (element, side) =>
        isColumnSide(side) ? GO_COLUMN_LETTERS[Number(element.coord[1])] : String(19 - Number(element.coord[0])),
    });

    // Four sides x 19 elements.
    expect(placements).toHaveLength(76);

    const north = placements.filter((p) => p.side === 'n');
    // Board extent starts at 56; labels sit 25.2 outside it, rounded.
    expect(north[0]).toMatchObject({ text: 'A', x: 56, y: Math.round(56 - 25.2) });
    // 'I' is skipped, so the 9th column is 'J'.
    expect(north[8].text).toBe('J');

    const west = placements.filter((p) => p.side === 'w');
    expect(west[0]).toMatchObject({ text: '19', x: Math.round(56 - 25.2) });
    expect(west.at(-1)).toMatchObject({ text: '1' });
  });

  it("places a face board's labels outside the cells, not inside them", () => {
    // chess: an 8x8 face board. The top row's centres sit half a square below
    // the extent, so anchoring to the element rather than the extent would put
    // the labels a half-square too low -- this is the bug the anchoring avoids.
    const board = squareLattice({
      cells: { rows: 8, cols: 8 },
      fit: { width: 512, height: 512, padding: 24 },
    });

    const [north] = labelPlacements(board, { offset: 12, sides: ['n'], text: () => 'x' });

    expect(north.y).toBe(Math.round(board.origin.y - 12));
    expect(north.y).toBeLessThan(board.origin.y);
    // The element's own centre is a half-cell lower; the label is not there.
    expect(north.element.y).toBeGreaterThan(board.origin.y);
  });

  it('tracks the element along the side and the extent across it', () => {
    const board = squareLattice({ points: { rows: 3, cols: 3 }, fit: { width: 100, height: 100, padding: 10 } });

    const placements = labelPlacements(board, { offset: 4, text: () => 'x' });

    for (const placement of placements) {
      if (isColumnSide(placement.side)) expect(placement.x).toBe(Math.round(placement.element.x));
      else expect(placement.y).toBe(Math.round(placement.element.y));
    }
  });

  it('skips an element whose text is null', () => {
    const board = squareLattice({ points: { rows: 3, cols: 3 } });

    const placements = labelPlacements(board, {
      offset: 4,
      sides: ['s'],
      text: (element: Element) => (element.coord[1] === 1 ? null : 'x'),
    });

    expect(placements).toHaveLength(2);
  });

  it('honours an explicit subset of sides', () => {
    const board = squareLattice({ points: { rows: 4, cols: 4 } });

    const placements = labelPlacements(board, { offset: 2, sides: ['s', 'w'], text: () => 'x' });

    expect(new Set(placements.map((p) => p.side))).toEqual(new Set(['s', 'w']));
  });

  it("ignores a hex board's non-cardinal sides rather than mispositioning them", () => {
    // A hexagon's sides are 'nne'/'sse' and friends; there is no single axis to
    // anchor those to, so they are skipped rather than guessed at.
    const board = squareLattice({ points: { rows: 3, cols: 3 } });

    expect(labelPlacements(board, { offset: 2, sides: ['nne'], text: () => 'x' })).toEqual([]);
  });
});
