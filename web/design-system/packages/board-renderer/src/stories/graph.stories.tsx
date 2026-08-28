import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { graphLattice, latticeStrokes, occupancyFromList } from '@kaggle-environments/board';
import { Graphics } from 'pixi.js';
import { drawGrid, type BoardRenderer, type SpriteLayer } from '../index';
import { BoardCanvas, StepControl } from './board-canvas';

/**
 * An irregular graph: hand-placed nodes and the links between them. Nine Men's
 * Morris, whose 24 points and connecting segments are already written longhand
 * in its renderer, drops in as-is.
 *
 * The same `drawGrid` that renders Go's 19x19 lattice renders this, because
 * both are "stroke the edges" -- `latticeStrokes` merges the fine-grained links
 * back into the long lines a player sees.
 */
const meta = {
  title: 'Board renderer/Graph (Nine Men’s Morris)',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

const BOX = 460;
const PADDING = 34;

/**
 * The three nested squares, outer to inner, 8 points each: the four corners and
 * the four edge midpoints of each ring.
 */
const NODES: Array<readonly [number, number]> = [
  [0, 0],
  [3, 0],
  [6, 0],
  [6, 3],
  [6, 6],
  [3, 6],
  [0, 6],
  [0, 3],
  [1, 1],
  [3, 1],
  [5, 1],
  [5, 3],
  [5, 5],
  [3, 5],
  [1, 5],
  [1, 3],
  [2, 2],
  [3, 2],
  [4, 2],
  [4, 3],
  [4, 4],
  [3, 4],
  [2, 4],
  [2, 3],
];

/**
 * Links, as *fine-grained* pairs. Adjacency is what these define, not just what
 * to stroke -- passing one long line spanning three points would draw the same
 * picture but make `neighborsOf` skip the middle node.
 */
const SEGMENTS: Array<readonly [number, number]> = [
  // Each ring, around.
  ...[0, 8, 16].flatMap((base) =>
    Array.from({ length: 8 }, (_, index) => [base + index, base + ((index + 1) % 8)] as const)
  ),
  // The four spokes joining the rings at the edge midpoints.
  ...[1, 3, 5, 7].flatMap((index) => [[index, index + 8] as const, [index + 8, index + 16] as const]),
];

/** Men placed in order, alternating colours. */
const PLACEMENTS = [0, 16, 4, 20, 2, 18, 6, 22, 9, 11, 13, 15, 1, 3];

function menAtStep(step: number): Array<0 | 1 | 2> {
  const men = Array.from({ length: NODES.length }, () => 0 as 0 | 1 | 2);
  PLACEMENTS.slice(0, step).forEach((node, index) => {
    men[node] = index % 2 === 0 ? 1 : 2;
  });
  return men;
}

const COLOURS: Record<1 | 2, number> = { 1: 0x2b2b2b, 2: 0xf4f1ea };

type Layer = 'board' | 'men';

function MorrisDemo() {
  const [step, setStep] = useState(PLACEMENTS.length);

  const board = useMemo(
    () => graphLattice({ nodes: NODES, segments: SEGMENTS, fit: { width: BOX, height: BOX, padding: PADDING } }),
    []
  );

  const options = useMemo(() => ({ board, layers: ['board', 'men'] as const }) as const, [board]);

  // `board.pitch` is the *median* gap between adjacent elements. That is the
  // right basis on a regular lattice, where every gap is the same one. Here the
  // links are 1, 2 and 3 units long and the median lands at 1.5 -- half again
  // the tightest spacing on the board, which is the gap a man actually has to
  // fit into. On an irregular graph, size from the shortest link instead.
  const closest = useMemo(() => Math.min(...board.edges.map((edge) => edge.length)), [board]);

  const setup = useMemo(
    () => (renderer: BoardRenderer<Layer>) => {
      renderer.layers.board.addChild(drawGrid(board, { color: 0x6b5f4d, width: 2 }));

      // A dot at every playable point, so empty places read as places.
      const dots = new Graphics();
      for (const point of board.points) dots.circle(point.x, point.y, 4).fill({ color: 0x6b5f4d });
      renderer.layers.board.addChild(dots);

      renderer.layers.board.cacheAsTexture(true);
    },
    [board]
  );

  const update = useMemo(() => {
    let men: SpriteLayer<0 | 1 | 2, Graphics> | null = null;

    return (renderer: BoardRenderer<Layer>, current: number) => {
      men ??= renderer.spriteLayer<0 | 1 | 2, Graphics>('men', {
        create: (occupant, element) => {
          const man = new Graphics();
          man
            .circle(element.x, element.y, closest * 0.3)
            .fill({ color: COLOURS[occupant.value as 1 | 2] })
            .stroke({ color: 0x3a3226, width: 1.5 });
          return man;
        },
      });

      // A flat list, not a grid: `occupancyFromList` keys by coordKey([index]),
      // which is exactly how graphLattice addresses its points. Forcing this
      // through a one-row grid would key it '0,index', which no lattice
      // addresses.
      men.sync(occupancyFromList(menAtStep(current), (value) => value === 0));
    };
  }, [board, closest]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: BOX }}>
      <BoardCanvas options={options} setup={setup} update={update} step={step} display={BOX} />
      <StepControl step={step} count={PLACEMENTS.length + 1} onChange={setStep} label={`${step} men placed`} />
      <p style={{ margin: 0, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#555' }}>
        {SEGMENTS.length} links merge into {latticeStrokes(board).length} drawn lines.
      </p>
    </div>
  );
}

export const NineMensMorris: StoryObj = { render: () => <MorrisDemo /> };
