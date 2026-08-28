import { coordKey, type Coord } from './types';

/**
 * One occupied place on the board.
 *
 * Carrying `coord` alongside `key` is deliberate. {@link coordKey} is one-way --
 * it joins on a comma and loses the element types -- so a diff that reported
 * only keys would force every consumer to either parse them (the one thing ids
 * and keys are documented not to allow) or keep a private index back to their
 * own row/column. Go's renderer needs `{ row, col }` for every added and removed
 * stone, and it is the reason this shape exists.
 */
export interface Occupant<T> {
  /** {@link coordKey} of `coord`. Useful as a Map key; still never parsed. */
  key: string;
  coord: Coord;
  value: T;
}

/** What is sitting where, keyed by {@link coordKey}. */
export type Occupancy<T> = ReadonlyMap<string, Occupant<T>>;

export interface OccupancyDiff<T> {
  added: Array<Occupant<T>>;
  removed: Array<Occupant<T>>;
  /** Same square, different occupant -- an Othello flip, a Chess capture in place. */
  changed: Array<{ key: string; coord: Coord; from: T; to: T }>;
  /** Only populated when `detectMoves` is set. */
  moved: Array<{ from: Coord; to: Coord; value: T }>;
}

export interface DiffOptions<T> {
  /**
   * Pair a removal with an addition of the same value and report it as one
   * move. Off by default because it is only correct for games where pieces
   * travel -- Go captures are not moves, Nine Men's Morris slides are.
   */
  detectMoves?: boolean;
  equals?: (a: T, b: T) => boolean;
  /**
   * Groups candidates for move pairing. The default stringifies, which is right
   * for the `'B'`/`'W'`/`1`/`2` occupants every game in this repo uses; override
   * it if occupants are objects.
   */
  valueKey?: (value: T) => string;
}

/**
 * Diff two board states into the events a renderer wants to animate.
 *
 * Generalises `go/…/graphics/diffGrids.ts` and the hand-rolled equivalents in
 * roughly four other renderers. Deriving the events is genuinely shared;
 * *drawing* them is not, and stays per-game.
 */
export function diffOccupancy<T>(
  prev: Occupancy<T> | null | undefined,
  next: Occupancy<T>,
  options: DiffOptions<T> = {}
): OccupancyDiff<T> {
  const equals = options.equals ?? Object.is;
  const previous: Occupancy<T> = prev ?? new Map<string, Occupant<T>>();

  const diff: OccupancyDiff<T> = { added: [], removed: [], changed: [], moved: [] };

  for (const [key, occupant] of next) {
    const before = previous.get(key);
    if (!before) diff.added.push(occupant);
    else if (!equals(before.value, occupant.value)) {
      diff.changed.push({ key, coord: occupant.coord, from: before.value, to: occupant.value });
    }
  }
  for (const [key, occupant] of previous) {
    if (!next.has(key)) diff.removed.push(occupant);
  }

  if (!options.detectMoves) return diff;

  const valueKey = options.valueKey ?? ((value: T) => String(value));
  const removedByValue = new Map<string, Array<Occupant<T>>>();
  for (const entry of diff.removed) {
    const group = removedByValue.get(valueKey(entry.value));
    if (group) group.push(entry);
    else removedByValue.set(valueKey(entry.value), [entry]);
  }

  const pairedAdded = new Set<string>();
  const pairedRemoved = new Set<string>();
  for (const entry of diff.added) {
    const group = removedByValue.get(valueKey(entry.value));
    const origin = group?.shift();
    if (!origin) continue;
    diff.moved.push({ from: origin.coord, to: entry.coord, value: entry.value });
    pairedAdded.add(entry.key);
    pairedRemoved.add(origin.key);
  }

  diff.added = diff.added.filter((entry) => !pairedAdded.has(entry.key));
  diff.removed = diff.removed.filter((entry) => !pairedRemoved.has(entry.key));

  return diff;
}

/**
 * The same bridge for boards that are a flat list rather than a grid.
 *
 * Keys match `coordKey([index])`, which is how {@link graphLattice} addresses its
 * points -- so this is the builder for every board that is a graph of numbered
 * places: Nine Men's Morris' 24 points, backgammon's 24 points and bar,
 * mancala's pits and stores. Those games emit `board[24]`, not `board[r][c]`,
 * and forcing them through a one-row grid would key them `0,index`, which no
 * lattice addresses.
 */
export function occupancyFromList<T>(list: ReadonlyArray<T>, isEmpty: (value: T) => boolean): Map<string, Occupant<T>> {
  const occupancy = new Map<string, Occupant<T>>();
  list.forEach((value, index) => {
    if (isEmpty(value)) return;
    const coord: Coord = [index];
    occupancy.set(coordKey(coord), { key: coordKey(coord), coord, value });
  });
  return occupancy;
}

/**
 * Bridge from the `Cell[][]` shape every transformer already emits to a coord-keyed
 * occupancy. Keys match `coordKey([row, col])`, which is what `squareLattice`
 * addresses points and faces by.
 */
export function occupancyFromGrid<T>(
  grid: ReadonlyArray<ReadonlyArray<T>>,
  isEmpty: (value: T) => boolean
): Map<string, Occupant<T>> {
  const occupancy = new Map<string, Occupant<T>>();
  grid.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (isEmpty(value)) return;
      const coord: Coord = [rowIndex, colIndex];
      occupancy.set(coordKey(coord), { key: coordKey(coord), coord, value });
    });
  });
  return occupancy;
}
