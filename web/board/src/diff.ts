import { coordKey } from './types';

/** What is sitting where, keyed by {@link coordKey}. */
export type Occupancy<T> = ReadonlyMap<string, T>;

export interface OccupancyDiff<T> {
  added: Array<{ key: string; value: T }>;
  removed: Array<{ key: string; value: T }>;
  /** Same square, different occupant -- an Othello flip, a Chess capture in place. */
  changed: Array<{ key: string; from: T; to: T }>;
  /** Only populated when `detectMoves` is set. */
  moved: Array<{ from: string; to: string; value: T }>;
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
  const previous: Occupancy<T> = prev ?? new Map<string, T>();

  const diff: OccupancyDiff<T> = { added: [], removed: [], changed: [], moved: [] };

  for (const [key, value] of next) {
    if (!previous.has(key)) diff.added.push({ key, value });
    else {
      const before = previous.get(key) as T;
      if (!equals(before, value)) diff.changed.push({ key, from: before, to: value });
    }
  }
  for (const [key, value] of previous) {
    if (!next.has(key)) diff.removed.push({ key, value });
  }

  if (!options.detectMoves) return diff;

  const valueKey = options.valueKey ?? ((value: T) => String(value));
  const removedByValue = new Map<string, Array<{ key: string; value: T }>>();
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
    diff.moved.push({ from: origin.key, to: entry.key, value: entry.value });
    pairedAdded.add(entry.key);
    pairedRemoved.add(origin.key);
  }

  diff.added = diff.added.filter((entry) => !pairedAdded.has(entry.key));
  diff.removed = diff.removed.filter((entry) => !pairedRemoved.has(entry.key));

  return diff;
}

/**
 * Bridge from the `Cell[][]` shape every transformer already emits to a coord-keyed
 * occupancy. Keys match `coordKey([row, col])`, which is what `squareLattice`
 * addresses points and faces by.
 */
export function occupancyFromGrid<T>(
  grid: ReadonlyArray<ReadonlyArray<T>>,
  isEmpty: (value: T) => boolean
): Map<string, T> {
  const occupancy = new Map<string, T>();
  grid.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (!isEmpty(value)) occupancy.set(coordKey([rowIndex, colIndex]), value);
    });
  });
  return occupancy;
}
