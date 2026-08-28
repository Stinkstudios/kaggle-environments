import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import chessFamily from '@kaggle-environments/design-system-assets/chess';
import { COLUMN_LETTERS, coordKey, occupancyFromGrid, squareLattice } from '@kaggle-environments/board';
import { Sprite } from 'pixi.js';
import { drawFaces, drawLabels, type BoardRenderer, type SpriteLayer } from '../index';
import { BoardCanvas, StepControl } from './board-canvas';

/**
 * A **face** lattice: the pieces sit in the cells, and the cells themselves are
 * what you draw. Chess, Othello and every hex game read a board this way.
 *
 * Same generator as the Go story -- `squareLattice` -- just spelled `cells`
 * rather than `points`, which is what makes `primary` (and so `elementAt`,
 * `board.sides` and the label anchoring) resolve to faces instead.
 */
const meta = {
  title: 'Board renderer/Face lattice (Chess)',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

const SIZE = 8;
const BOX = 512;
const PADDING = 26;
const LIGHT = 0xf0d9b5;
const DARK = 0xb58863;

type Layer = 'board' | 'pieces';

/** Rows top-to-bottom, so row 0 is Black's back rank -- FEN order. */
const START = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];

/** (from, to) as [row, col] pairs -- the Scholar's Mate opening. */
const MOVES: Array<[[number, number], [number, number]]> = [
  [
    [6, 4],
    [4, 4],
  ],
  [
    [1, 4],
    [3, 4],
  ],
  [
    [7, 5],
    [4, 2],
  ],
  [
    [0, 1],
    [2, 2],
  ],
  [
    [7, 3],
    [3, 7],
  ],
  [
    [0, 6],
    [2, 5],
  ],
  [
    [3, 7],
    [1, 5],
  ],
];

function positionAtStep(step: number): string[][] {
  const rows = START.map((row) => [...row]);
  for (const [[fromRow, fromCol], [toRow, toCol]] of MOVES.slice(0, step)) {
    rows[toRow][toCol] = rows[fromRow][fromCol];
    rows[fromRow][fromCol] = '.';
  }
  return rows;
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** 'R' -> 'chess:w-rook', 'n' -> 'chess:b-knight'. */
function pieceId(letter: string): string {
  const colour = letter === letter.toUpperCase() ? 'w' : 'b';
  return `chess:${colour}-${PIECE_NAME[letter.toLowerCase()]}`;
}

function ChessDemo() {
  const [step, setStep] = useState(MOVES.length);

  const board = useMemo(
    () => squareLattice({ cells: { rows: SIZE, cols: SIZE }, fit: { width: BOX, height: BOX, padding: PADDING } }),
    []
  );

  const options = useMemo(
    () => ({ board, layers: ['board', 'pieces'] as const, families: [chessFamily] }) as const,
    [board]
  );

  const setup = useMemo(
    () => async (renderer: BoardRenderer<Layer>) => {
      await document.fonts.load('13px "Inter"');

      renderer.layers.board.addChild(
        drawFaces(board, {
          // Every face is painted here, but a game with a textured dark tile
          // returns null for the light squares and lets the page show through
          // -- which is exactly what chess's own renderer does today.
          fill: (face) => ((Number(face.coord[0]) + Number(face.coord[1])) % 2 === 0 ? LIGHT : DARK),
        })
      );

      renderer.layers.board.addChild(
        drawLabels(board, {
          offset: PADDING * 0.5,
          style: { fontSize: 13, fill: 0x4a4a4a },
          text: (element, side) =>
            side === 'n' || side === 's'
              ? COLUMN_LETTERS[Number(element.coord[1])]
              : String(SIZE - Number(element.coord[0])),
        })
      );

      renderer.layers.board.cacheAsTexture(true);
    },
    [board]
  );

  const update = useMemo(() => {
    let pieces: SpriteLayer<string, Sprite> | null = null;

    return (renderer: BoardRenderer<Layer>, current: number) => {
      pieces ??= renderer.spriteLayer<string, Sprite>('pieces', {
        create: (occupant, element) => {
          const sprite = new Sprite({ texture: renderer.texture(pieceId(occupant.value)), anchor: 0.5 });
          sprite.width = board.pitch * 0.86;
          sprite.height = board.pitch * 0.86;
          sprite.position.set(element.x, element.y);
          return sprite;
        },
      });

      // Chess pieces travel, so pairing a departure with an arrival is correct
      // here -- and it is why this is opt-in. The same call on a Go board would
      // report a capture as a move across the board.
      const diff = pieces.sync(
        occupancyFromGrid(positionAtStep(current), (cell) => cell === '.'),
        {
          detectMoves: true,
        }
      );

      // The layer rekeys a moved sprite but never repositions it: where a piece
      // travels from is the animation the game owns. Snapping is this story's
      // choice; a real visualizer springs it.
      for (const move of diff.moved) {
        const sprite = pieces.get(coordKey(move.to));
        const element = board.faceAt(move.to);
        if (sprite && element) sprite.position.set(element.x, element.y);
      }
    };
  }, [board]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: BOX }}>
      <BoardCanvas options={options} setup={setup} update={update} step={step} display={BOX} />
      <StepControl step={step} count={MOVES.length + 1} onChange={setStep} label={`${step} of ${MOVES.length} plies`} />
    </div>
  );
}

export const Chess: StoryObj = { render: () => <ChessDemo /> };
