import type { Board, Element } from './types';

/** One resolved label: what to draw, and where, in the board's final coordinates. */
export interface LabelPlacement {
  text: string;
  x: number;
  y: number;
  /** The `board.sides` group this came from, e.g. `'n'`. */
  side: string;
  element: Element;
}

export interface LabelOptions {
  /**
   * Distance outside the board's extent, in final units. `go` uses
   * `BOARD_PADDING * 0.45` and `chess` uses half its offset -- both are "a bit
   * less than the padding reserved for me", so derive it from the same padding
   * you passed to `fit`.
   */
  offset: number;
  /**
   * Which sides to label. Defaults to all four cardinals that the board has.
   * `chess` and `go` both label all four; a one-sided board passes `['s', 'w']`.
   */
  sides?: readonly string[];
  /**
   * The text for one element on one side, or `null` to skip it.
   *
   * Read the element's `coord`, never its `id` -- `go` needs A-T *skipping I*
   * and rows counting up from the bottom, `chess` needs plain A-H, and only the
   * coord says unambiguously which row or column this is. The side id alone
   * cannot: `board.sides` runs clockwise, so `'e'` and `'w'` traverse rows in
   * opposite directions.
   */
  text: (element: Element, side: string) => string | null;
}

/** Sides this understands. A hex board's `'nne'`/`'sse'` groups are skipped. */
const CARDINALS = new Set(['n', 'e', 's', 'w']);

/**
 * Where every coordinate label goes, as plain data.
 *
 * Positions are anchored to the **board's extent**, not to the outermost
 * element, so a face board's labels sit outside the squares rather than inside
 * them by half a cell. That reproduces `chess`'s `boardOffset / 2` and `go`'s
 * `BOARD_PADDING * 0.45` placements exactly.
 *
 * Renderer-agnostic, and deliberately here rather than in a drawing package:
 * `havannah`'s Canvas2D renderer hand-rolls this against `fillText`, and cannot
 * reach a version that lives behind a Pixi import. It returns data, not text
 * nodes -- what draws them stays the caller's business.
 */
export function labelPlacements(board: Board, options: LabelOptions): LabelPlacement[] {
  const { offset, sides, text } = options;
  const wanted = sides ? new Set(sides) : CARDINALS;

  const left = board.origin.x;
  const right = board.origin.x + board.width;
  const top = board.origin.y;
  const bottom = board.origin.y + board.height;

  const placements: LabelPlacement[] = [];

  for (const group of board.sides) {
    if (!wanted.has(group.id) || !CARDINALS.has(group.id)) continue;

    for (const element of group.elements) {
      const label = text(element, group.id);
      if (label === null) continue;

      // Labels track the element along the side and the extent across it.
      const position =
        group.id === 'n'
          ? { x: element.x, y: top - offset }
          : group.id === 's'
            ? { x: element.x, y: bottom + offset }
            : group.id === 'w'
              ? { x: left - offset, y: element.y }
              : { x: right + offset, y: element.y };

      // Rounded because Pixi Text is a rasterised texture -- a fractional
      // position blurs it. Both existing renderers already round here.
      placements.push({
        text: label,
        x: Math.round(position.x),
        y: Math.round(position.y),
        side: group.id,
        element,
      });
    }
  }

  return placements;
}

/**
 * The column letters Go uses: A-T with **I omitted**, because I and J are too
 * easy to confuse in a handwritten record. Chess does not do this, which is why
 * it is opt-in rather than the default.
 */
export const GO_COLUMN_LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
export const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
