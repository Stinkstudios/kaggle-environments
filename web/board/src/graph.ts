import { createBoard, type UnitEdge, type UnitPoint } from './board';
import type { Board } from './types';
import type { LatticeOptions } from './square';

export interface GraphLatticeOptions extends LatticeOptions {
  /** Node positions in whatever units suit the board -- they get normalised and fitted. */
  nodes: ReadonlyArray<readonly [number, number]>;
  /**
   * Connections, as pairs of indices into `nodes`.
   *
   * These define **adjacency**, not just what to stroke. Pass the fine-grained
   * links (0-1, 1-2) rather than one long line spanning three points (0-2), or
   * `neighborsOf` will skip the middle node. Nine Men's Morris' renderer
   * currently stores the long form because it only ever draws it -- collinear
   * short segments render identically, so the fine-grained form loses nothing.
   */
  segments: ReadonlyArray<readonly [number, number]>;
}

/**
 * A board that is just a graph: hand-placed nodes and the lines between them.
 *
 * This is Nine Men's Morris, whose 24 points and 16 connecting segments are
 * already written out longhand in its renderer and drop in here as-is. It is
 * also the honest escape hatch for the boards that will never be a lattice --
 * backgammon's points and bar, mancala's pits and stores, hive's floating
 * cluster. Treating those as a first-class case is better than pretending a
 * lattice generator can be stretched to cover them.
 */
export function graphLattice(options: GraphLatticeOptions): Board {
  const points: UnitPoint[] = options.nodes.map(([x, y], index) => ({ coord: [index], x, y }));

  const edges: UnitEdge[] = options.segments.map(([from, to]) => {
    if (!options.nodes[from] || !options.nodes[to]) {
      throw new Error(
        `graphLattice segment [${from}, ${to}] references a node outside 0..${options.nodes.length - 1}.`
      );
    }
    return { coord: [from, to], a: [from], b: [to] };
  });

  return createBoard({ primary: 'point', points, edges, faces: [] }, options);
}
