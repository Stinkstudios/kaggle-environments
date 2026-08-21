import type { FamilyInfo } from '@kaggle-environments/design-system-assets';
import chessFamily from '@kaggle-environments/design-system-assets/chess';
import boardFamily from '@kaggle-environments/design-system-assets/board';
import fxFamily from '@kaggle-environments/design-system-assets/fx';
import chessFxFamily from '@kaggle-environments/design-system-assets/chess-fx';

export const BOARD_SIZE = 8;
export const CHAR_CODE_A = 97; // 'a'.charCodeAt(0)

/**
 * Padding around the 8x8 grid as a percentage of one square. Used to position the board labels.
 * @see drawBoard
 */
export const BOARD_PADDING_RATIO = 0.4;

export const GRID_LINE_WIDTH = 1;

export const LAYERS = ['background', 'highlights', 'pieces', 'vfx', 'animating'] as const;
export type Layer = (typeof LAYERS)[number];

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

/** chess.js piece letters -> the names used in the shared asset id vocabulary. */
export const PIECE_NAME: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

/**
 * Stable asset id for a piece, e.g. pieceId('w', 'k') -> 'chess:w-king'.
 * Renderers address artwork by id; filenames never appear in game code.
 */
export function pieceId(color: PieceColor, type: PieceType): string {
  return `chess:${color}-${PIECE_NAME[type]}`;
}

/**
 * Asset families this visualizer loads at start-up.
 *
 * `fx` is the shared particle family (puffs, used by go too); `chess-fx` is
 * this game's own — several of those particles are chess piece silhouettes and
 * are deliberately not offered as generic decoration.
 *
 * These are imported per-family on purpose. The package root is a barrel over
 * every family, so importing `pieceFamily` from it would bundle the 54-card
 * deck into this visualizer — a megabyte of artwork no chess board ever draws.
 * Naming each family as an import keeps the bundle honest: what you see here is
 * what ships.
 */
export const ASSET_FAMILIES: FamilyInfo[] = [chessFamily, boardFamily, fxFamily, chessFxFamily];
