import { useMemo, useState } from 'react';
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
 * The comparison worth making here is the seams. Every interior edge belongs to
 * two cells and is therefore drawn twice, once by each neighbour, and two
 * hand-drawn strokes do not coincide. Whether that reads as cell-by-cell
 * character or as muddy interior lines is a decision to make by looking, which
 * is what this story is for.
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
 * The whole outline against the half. Every interior edge belongs to two cells,
 * so the whole hexagon draws it twice; the half carries three contiguous edges
 * and the three neighbours draw the rest.
 */
export const WholeVsHalf: StoryObj = {
  render: function Render() {
    const board = useHexBoard('hexagon', 'pointy');
    return (
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
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
          caption="hex-half-solid — drawn once, outline closed"
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

/** The artwork against the `Graphics` stroke it is meant to replace. */
export const AgainstProgrammatic: StoryObj = {
  render: function Render() {
    const board = useHexBoard('hexagon', 'pointy');
    return (
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <HexBoard
          board={board}
          draw={(renderer, b) =>
            renderer.layers.board.addChild(drawFaces(b, { stroke: { color: 0x000000, width: 1.5 } }))
          }
          caption="drawFaces — programmatic stroke, one line per shared edge"
        />
        <HexBoard
          board={board}
          draw={(renderer, b) => renderer.layers.board.addChild(drawFaceSprites(b, { style: 'hex-half-solid', textures: renderer.textures }))}
          caption="drawFaceSprites — board:hex-solid, one sprite per cell"
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

/**
 * The `scale` knob. The master is cropped to the outside of a stroke with real
 * width, so a sprite fitted to the cell's exact circumradius seats its drawn
 * line marginally inside the cell — and neighbouring outlines pull apart rather
 * than overlap. Nudge it here rather than by editing the artwork.
 */
export const Overlap: StoryObj = {
  render: function Render() {
    const board = useHexBoard('hexagon', 'pointy');
    const [scale, setScale] = useState(1);
    const draw = useMemo(
      () => (renderer: BoardRenderer<Layer>, b: Board) =>
        renderer.layers.board.addChild(drawFaceSprites(b, { style: 'hex-half-solid', textures: renderer.textures, scale })),
      [scale]
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <HexBoard board={board} draw={draw} caption={`scale ${scale.toFixed(3)}`} />
        <input
          type="range"
          min={0.94}
          max={1.06}
          step={0.002}
          value={scale}
          onChange={(event) => setScale(Number(event.target.value))}
        />
      </div>
    );
  },
};
