import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { hexLattice, type Board } from '@kaggle-environments/board';
import { Graphics } from 'pixi.js';
import { drawBorder, drawFaces, type BoardRenderer } from '../index';
import { BoardCanvas } from './board-canvas';

/**
 * Hex boards, and the reason board *outlines* are geometry rather than per-game
 * code. Every hex game in the repo is a connection game, and each needs to know
 * which cells are which edge: Hex colours `n`/`s` for one player and `e`/`w`
 * for the other, Havannah counts its 6 corners and 6 sides, Y needs its 3
 * sides. `havannah/renderer.ts` currently hand-rolls that as `classifyCell`.
 *
 * Nothing here loads an asset family -- these boards are drawn entirely from
 * `face.corners` and `side.segments`.
 */
const meta = {
  title: 'Board renderer/Hex (connection games)',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

const BOX = 460;
const PADDING = 22;
const CELL = 0xe8e2d5;
const CELL_EDGE = 0x8a8172;

const PLAYER_COLOURS = ['#d94f45', '#3d7ab8', '#57a05a', '#c9a227', '#8a5cb8', '#3fa89b'];

type Layer = 'cells' | 'borders';

function HexDemo({
  board,
  sideColour,
  showCorners,
  caption,
}: {
  board: Board;
  sideColour: (id: string, index: number) => number | null;
  showCorners?: boolean;
  caption: string;
}) {
  const options = useMemo(() => ({ board, layers: ['cells', 'borders'] as const }) as const, [board]);

  const setup = useMemo(
    () => (renderer: BoardRenderer<Layer>) => {
      renderer.layers.cells.addChild(
        drawFaces(board, { fill: () => CELL, stroke: { color: CELL_EDGE, width: 1, alpha: 0.6 } })
      );

      // `segments` are the outward-facing facets: a facet is a board boundary
      // exactly when only one face touches it, so they fall out of the same
      // adjacency table `neighborsOf` uses. Stroking them is the goal marker.
      board.sides.forEach((side, index) => {
        const colour = sideColour(side.id, index);
        if (colour === null) return;
        renderer.layers.borders.addChild(drawBorder(side.segments, { color: colour, width: 5 }));
      });

      if (showCorners) {
        // A corner cell satisfies two sides and appears in both groups as well
        // as in `corners`. Havannah's fork rule excludes corners, so it
        // subtracts them itself -- the geometry does not decide that.
        for (const corner of board.corners) {
          for (const element of corner.elements) {
            const marker = new Graphics();
            marker.circle(element.x, element.y, board.pitch * 0.18).fill({ color: 0x222222, alpha: 0.75 });
            renderer.layers.borders.addChild(marker);
          }
        }
      }
    },
    [board, sideColour, showCorners]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: BOX }}>
      <BoardCanvas options={options} setup={setup} display={BOX} />
      <p style={{ margin: 0, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#555' }}>{caption}</p>
    </div>
  );
}

/** Hex: a rhombus, with one player owning n/s and the other e/w. */
export const Hex: StoryObj = {
  render: function Render() {
    const board = useMemo(
      () => hexLattice({ extent: 'rhombus', rows: 11, cols: 11, fit: { width: BOX, height: BOX, padding: PADDING } }),
      []
    );
    return (
      <HexDemo
        board={board}
        sideColour={(id) => (id === 'n' || id === 's' ? 0xd94f45 : 0x3d7ab8)}
        caption="Rhombus extent. Red connects n↔s, blue connects e↔w. Corner cells belong to both groups, which is what Hex wants."
      />
    );
  },
};

/** Havannah: a hexagon, whose 6 sides and 6 corners are separate win conditions. */
export const Havannah: StoryObj = {
  render: function Render() {
    const board = useMemo(
      () => hexLattice({ extent: 'hexagon', size: 8, fit: { width: BOX, height: BOX, padding: PADDING } }),
      []
    );
    return (
      <HexDemo
        board={board}
        sideColour={(_id, index) => Number(PLAYER_COLOURS[index].replace('#', '0x'))}
        showCorners
        caption="Hexagon extent, size 8 — 169 cells. Six sides (fork) and six corners (bridge), dotted. board.corners is why havannah's classifyCell can go."
      />
    );
  },
};

/** Y: a triangle with three sides and no fourth to disambiguate them. */
export const Y: StoryObj = {
  render: function Render() {
    const board = useMemo(
      () => hexLattice({ extent: 'triangle', size: 11, fit: { width: BOX, height: BOX, padding: PADDING } }),
      []
    );
    return (
      <HexDemo
        board={board}
        sideColour={(_id, index) => Number(PLAYER_COLOURS[index].replace('#', '0x'))}
        caption="Triangle extent. Three sides, all of which one player must connect."
      />
    );
  },
};

/** Flat-top, to show orientation is independent of extent. */
export const FlatTop: StoryObj = {
  render: function Render() {
    const [size, setSize] = useState(6);
    const board = useMemo(
      () =>
        hexLattice({
          extent: 'hexagon',
          size,
          orientation: 'flat',
          fit: { width: BOX, height: BOX, padding: PADDING },
        }),
      [size]
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <HexDemo
          board={board}
          sideColour={(_id, index) => Number(PLAYER_COLOURS[index].replace('#', '0x'))}
          caption="Orientation and extent are independent axes — conflating them is what turns a hex module into a one-game module."
        />
        <input type="range" min={2} max={9} value={size} onChange={(event) => setSize(Number(event.target.value))} />
      </div>
    );
  },
};
