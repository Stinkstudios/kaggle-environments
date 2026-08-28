import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import boardFamily from '@kaggle-environments/design-system-assets/board';
import { hexLattice, type Board } from '@kaggle-environments/board';
import { drawFaceSprites, drawFaces, type BoardRenderer } from '../index';
import { BoardCanvas } from './board-canvas';

/**
 * The hand-drawn hexagon cell, against the programmatic stroke it replaces.
 *
 * `drawGrid` cannot serve this: it tiles a strip along the merged runs of
 * `latticeStrokes`, and `board:hex-solid` is a closed outline with no run to
 * tile it along. So the cell art is its own function, walking `board.faces`.
 *
 * The seam question these were built to answer is settled: the half asset draws
 * each shared edge once. What is left here is the comparison that justifies it
 * and the one live decision, `closeBoundary`.
 */
const meta = {
  title: 'Board renderer/Hex cell styles',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

const BOX = 380;
const PADDING = 12;

type Layer = 'board';

function HexBoard({
  board,
  draw,
  caption,
}: {
  board: Board;
  draw: (renderer: BoardRenderer<Layer>, board: Board) => void;
  caption: string;
}) {
  const rendererOptions = useMemo(
    () => ({ board, layers: ['board'] as const, families: [boardFamily], mipmaps: true }) as const,
    [board]
  );

  const setup = useMemo(
    () => (renderer: BoardRenderer<Layer>) => {
      draw(renderer, board);
    },
    [board, draw]
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

/**
 * One board for every story here. Extents and orientations are exercised in
 * `Hex (connection games)`, which shows them in a real game context; these
 * stories are about the cell treatment, so they hold the board still.
 */
function useHexBoard() {
  return useMemo(
    () => hexLattice({ extent: 'hexagon', size: 4, fit: { width: BOX, height: BOX, padding: PADDING } }),
    []
  );
}

/**
 * The three ways to draw a hex cell, on one board.
 *
 * Left is the programmatic fallback. `drawGrid` cannot serve a hex board at all
 * -- it tiles a strip along the merged runs of `latticeStrokes`, and a closed
 * outline has no run to tile along -- so before the artwork existed this stroke
 * was the only option.
 *
 * Middle and right are the artwork. Every interior edge belongs to two cells, so
 * the whole outline draws it twice; the half carries three contiguous edges and
 * the three neighbours draw the rest, for half the sprites and one stroke per
 * edge.
 */
export const CellStyles: StoryObj = {
  render: function Render() {
    const board = useHexBoard();
    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <HexBoard
          board={board}
          draw={(renderer, b) =>
            renderer.layers.board.addChild(drawFaces(b, { stroke: { color: 0x000000, width: 1.5 } }))
          }
          caption="drawFaces — programmatic stroke, no artwork"
        />
        <HexBoard
          board={board}
          draw={(renderer, b) =>
            renderer.layers.board.addChild(drawFaceSprites(b, { style: 'hex-solid', textures: renderer.textures }))
          }
          caption="hex-solid — every shared edge drawn twice"
        />
        <HexBoard
          board={board}
          draw={(renderer, b) =>
            renderer.layers.board.addChild(
              drawFaceSprites(b, { style: 'hex-half-solid', textures: renderer.textures })
            )
          }
          caption="hex-half-solid — drawn once (the default for a board)"
        />
      </div>
    );
  },
};

/**
 * Solid and dashed, both as halves.
 *
 * The dashed master is where doubling hurts most. Two doubled solid strokes
 * merge into one slightly heavier line; two doubled dashed strokes arrive at
 * different phases and interleave, because the two cells present opposite edges
 * of the artwork to the same lattice edge and traverse them in opposite
 * directions.
 *
 * Note the dash pattern is phase-aligned to the vertices — each edge begins and
 * ends with a half-length dash, so two edges meeting at a vertex read as one
 * dash across it. That is also why the halves can be cut at a vertex without
 * disturbing the rhythm.
 */
export const SolidAndDashed: StoryObj = {
  render: function Render() {
    const board = useHexBoard();
    return (
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <HexBoard
          board={board}
          draw={(renderer, b) =>
            renderer.layers.board.addChild(
              drawFaceSprites(b, { style: 'hex-half-solid', textures: renderer.textures })
            )
          }
          caption="hex-half-solid"
        />
        <HexBoard
          board={board}
          draw={(renderer, b) =>
            renderer.layers.board.addChild(
              drawFaceSprites(b, { style: 'hex-half-dash', textures: renderer.textures })
            )
          }
          caption="hex-half-dash"
        />
      </div>
    );
  },
};

/** With and without the boundary closed, which is the `closeBoundary` call. */
export const Boundary: StoryObj = {
  render: function Render() {
    const board = useHexBoard();
    return (
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <HexBoard
          board={board}
          draw={(renderer, b) =>
            renderer.layers.board.addChild(
              drawFaceSprites(b, { style: 'hex-half-solid', textures: renderer.textures, closeBoundary: false })
            )
          }
          caption="closeBoundary: false — half the outline open"
        />
        <HexBoard
          board={board}
          draw={(renderer, b) =>
            renderer.layers.board.addChild(
              drawFaceSprites(b, { style: 'hex-half-solid', textures: renderer.textures })
            )
          }
          caption="closeBoundary: true (default)"
        />
      </div>
    );
  },
};
