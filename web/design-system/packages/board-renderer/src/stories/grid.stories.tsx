import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import goFamily from '@kaggle-environments/design-system-assets/go';
import { GO_COLUMN_LETTERS, occupancyFromGrid, squareLattice } from '@kaggle-environments/board';
import { Sprite } from 'pixi.js';
import { drawGrid, drawLabels, type BoardRenderer, type SpriteLayer } from '../index';
import { BoardCanvas, StepControl } from './board-canvas';

/**
 * A **point** lattice: the pieces sit on the intersections, and the lattice's
 * edges are the thing you draw. Go, Dots & Boxes and Nine Men's Morris all
 * read a board this way.
 */
const meta = {
  title: 'Board renderer/Point lattice (Go)',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

const SIZE = 19;
const BOX = 512;
const PADDING = 56;

/** A short opening, as (row, col, colour) in play order. */
const MOVES: Array<[number, number, 'B' | 'W']> = [
  [3, 3, 'B'],
  [15, 15, 'W'],
  [3, 15, 'B'],
  [15, 3, 'W'],
  [2, 5, 'B'],
  [16, 13, 'W'],
  [5, 2, 'B'],
  [13, 16, 'W'],
  [9, 9, 'B'],
  [9, 3, 'W'],
  [3, 9, 'B'],
  [15, 9, 'W'],
];

function gridAtStep(step: number): string[][] {
  const rows = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => '.'));
  for (const [row, col, colour] of MOVES.slice(0, step)) rows[row][col] = colour;
  return rows;
}

const HOSHI: Array<[number, number]> = [
  [3, 3],
  [3, 9],
  [3, 15],
  [9, 3],
  [9, 9],
  [9, 15],
  [15, 3],
  [15, 9],
  [15, 15],
];

function GoDemo() {
  const [step, setStep] = useState(MOVES.length);

  // One Board for the life of the story. Everything else is derived from it --
  // the canvas size, the grid, the labels, and where each stone goes.
  const board = useMemo(
    () => squareLattice({ points: { rows: SIZE, cols: SIZE }, fit: { width: BOX, height: BOX, padding: PADDING } }),
    []
  );

  const options = useMemo(
    () =>
      ({
        board,
        layers: ['board', 'shadows', 'stones'] as const,
        families: [goFamily],
        // 256px stone masters drawn at ~22px; without mipmaps the downscale
        // aliases badly.
        mipmaps: true,
      }) as const,
    [board]
  );

  const setup = useMemo(
    () => async (renderer: BoardRenderer<'board' | 'shadows' | 'stones'>) => {
      await document.fonts.load('11px "Inter"');

      // 38 merged lines out of 684 unit edges -- latticeStrokes does that.
      renderer.layers.board.addChild(drawGrid(board, { color: 0x000000, alpha: 0.7, crisp: true }));

      for (const coord of HOSHI) {
        const point = board.pointAt(coord)!;
        const hoshi = new Sprite({ texture: renderer.texture('go:hoshi'), anchor: 0.5 });
        hoshi.width = board.pitch * 0.25;
        hoshi.height = board.pitch * 0.25;
        hoshi.position.set(point.x, point.y);
        renderer.layers.board.addChild(hoshi);
      }

      renderer.layers.board.addChild(
        drawLabels(board, {
          offset: PADDING * 0.45,
          // Read the coord, never the id. Go skips 'I' in its columns and
          // counts rows up from the bottom; only the coord says which is which.
          text: (element, side) =>
            side === 'n' || side === 's'
              ? GO_COLUMN_LETTERS[Number(element.coord[1])]
              : String(SIZE - Number(element.coord[0])),
        })
      );

      // Cached once: the furniture never changes, so it costs one draw call
      // per frame instead of ~400.
      renderer.layers.board.cacheAsTexture(true);
    },
    [board]
  );

  const update = useMemo(() => {
    let stones: SpriteLayer<string, Sprite> | null = null;

    return (renderer: BoardRenderer<'board' | 'shadows' | 'stones'>, current: number) => {
      stones ??= renderer.spriteLayer<string, Sprite>('stones', {
        create: (occupant, element) => {
          const sprite = new Sprite({
            texture: renderer.texture(occupant.value === 'B' ? 'go:b-stone' : 'go:w-stone'),
            anchor: 0.5,
          });
          sprite.width = board.pitch * 0.92;
          sprite.height = board.pitch * 0.92;
          sprite.position.set(element.x, element.y);
          return sprite;
        },
      });

      stones.sync(occupancyFromGrid(gridAtStep(current), (cell) => cell === '.'));
    };
  }, [board]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: BOX }}>
      <BoardCanvas options={options} setup={setup} update={update} step={step} display={BOX} />
      <StepControl step={step} count={MOVES.length + 1} onChange={setStep} label={`${step} of ${MOVES.length} moves`} />
    </div>
  );
}

export const Go: StoryObj = { render: () => <GoDemo /> };
