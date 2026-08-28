import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import boardFamily from '@kaggle-environments/design-system-assets/board';
import { hexLattice, type Board, type HexExtent, type HexOrientation } from '@kaggle-environments/board';
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

function useHexBoard(extent: HexExtent, orientation: HexOrientation, size = 4) {
  return useMemo(
    () =>
      hexLattice(
        extent === 'rhombus'
          ? { extent, rows: size, cols: size, orientation, fit: { width: BOX, height: BOX, padding: PADDING } }
          : { extent, size, orientation, fit: { width: BOX, height: BOX, padding: PADDING } }
      ),
    [extent, orientation, size]
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
    const board = useHexBoard('hexagon', 'pointy');
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

/** With and without the boundary closed, which is the `closeBoundary` call. */
export const Boundary: StoryObj = {
  render: function Render() {
    const board = useHexBoard('hexagon', 'pointy');
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

/**
 * One master, both orientations. `hexRotation` reads the turn off the polygon's
 * own corners, so nothing here passes an orientation to the renderer.
 */
export const BothOrientations: StoryObj = {
  render: function Render() {
    const pointy = useHexBoard('hexagon', 'pointy');
    const flat = useHexBoard('hexagon', 'flat');
    const draw = useMemo(
      () => (renderer: BoardRenderer<Layer>, b: Board) =>
        renderer.layers.board.addChild(drawFaceSprites(b, { style: 'hex-half-solid', textures: renderer.textures })),
      []
    );
    return (
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <HexBoard board={pointy} draw={draw} caption="pointy-top — the master, unturned" />
        <HexBoard board={flat} draw={draw} caption="flat-top — the same master, turned 30°" />
      </div>
    );
  },
};

/** Every extent the hex generator emits, on the one cell style. */
export const Extents: StoryObj = {
  render: function Render() {
    const hexagon = useHexBoard('hexagon', 'pointy');
    const rhombus = useHexBoard('rhombus', 'pointy');
    const triangle = useHexBoard('triangle', 'pointy', 6);
    const draw = useMemo(
      () => (renderer: BoardRenderer<Layer>, b: Board) =>
        renderer.layers.board.addChild(drawFaceSprites(b, { style: 'hex-half-solid', textures: renderer.textures })),
      []
    );
    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <HexBoard board={hexagon} draw={draw} caption="hexagon — havannah" />
        <HexBoard board={rhombus} draw={draw} caption="rhombus — dark_hex" />
        <HexBoard board={triangle} draw={draw} caption="triangle — y" />
      </div>
    );
  },
};
