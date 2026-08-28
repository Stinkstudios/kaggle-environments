import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import boardFamily from '@kaggle-environments/design-system-assets/board';
import { GO_COLUMN_LETTERS, squareLattice } from '@kaggle-environments/board';
import { drawGrid, drawLabels, type BoardRenderer, type GridOptions } from '../index';
import { BoardCanvas } from './board-canvas';

/**
 * The board-line styles, on the same board, for comparison.
 *
 * `chess` draws `plain` today and `go` draws `squiggle-dash`; nothing has decided
 * whether that difference is intentional. This story exists so that call can be
 * made by looking rather than by arguing.
 */
const meta = {
  title: 'Board renderer/Board line styles',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

const BOX = 400;
const PADDING = 44;
const SIZE = 9;

type Layer = 'board';

function StyledBoard({
  options: gridOptions,
  caption,
}: {
  options: (r: BoardRenderer<Layer>) => GridOptions;
  caption: string;
}) {
  const board = useMemo(
    () => squareLattice({ points: { rows: SIZE, cols: SIZE }, fit: { width: BOX, height: BOX, padding: PADDING } }),
    []
  );

  const rendererOptions = useMemo(
    () => ({ board, layers: ['board'] as const, families: [boardFamily], mipmaps: true }) as const,
    [board]
  );

  const setup = useMemo(
    () => async (renderer: BoardRenderer<Layer>) => {
      await document.fonts.load('11px "Inter"');
      renderer.layers.board.addChild(drawGrid(board, gridOptions(renderer)));
      renderer.layers.board.addChild(
        drawLabels(board, {
          offset: PADDING * 0.55,
          style: { fontSize: 11 },
          text: (element, side) =>
            side === 'n' || side === 's'
              ? GO_COLUMN_LETTERS[Number(element.coord[1])]
              : String(SIZE - Number(element.coord[0])),
        })
      );
    },
    [board, gridOptions]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: BOX }}>
      <BoardCanvas options={rendererOptions} setup={setup} display={BOX} />
      <p style={{ margin: 0, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#555', textAlign: 'center' }}>
        {caption}
      </p>
    </div>
  );
}

/** The two styles on one screen — the comparison the decision needs. */
export const SideBySide: StoryObj = {
  render: function Render() {
    return (
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <StyledBoard options={() => ({ style: 'plain', crisp: true, alpha: 0.7 })} caption="plain — chess draws this" />
        <StyledBoard
          options={(renderer) => ({ style: 'squiggle-dash', textures: renderer.textures })}
          caption="squiggle-dash — go draws this"
        />
      </div>
    );
  },
};

/** The knobs each style exposes, so a third style can be judged against them. */
export const SquiggleScale: StoryObj = {
  render: function Render() {
    const [scale, setScale] = useState(0.5);
    const options = useMemo(
      () => (renderer: BoardRenderer<Layer>) =>
        ({ style: 'squiggle-dash', textures: renderer.textures, tileScale: scale }) as GridOptions,
      [scale]
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <StyledBoard
          options={options}
          caption={`tileScale ${scale.toFixed(2)} — line height follows the scale, so the brush never stretches`}
        />
        <input
          type="range"
          min={0.2}
          max={1.5}
          step={0.05}
          value={scale}
          onChange={(event) => setScale(Number(event.target.value))}
        />
      </div>
    );
  },
};
