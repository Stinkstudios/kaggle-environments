import {
  coordKey,
  diffOccupancy,
  type Board,
  type Coord,
  type Face,
  type Occupancy,
  type OccupancyDiff,
  type Occupant,
  type Point,
} from '@kaggle-environments/board';

/**
 * The element a coord addresses on this board.
 *
 * Which of `pointAt`/`faceAt` is right is the board's own business -- Go plays
 * on intersections, Chess on cells, and `primary` records which. Callers that
 * hardcode one break the moment the same renderer is pointed at the other.
 */
export function elementAt(board: Board, coord: Coord): Point | Face | null {
  return board.primary === 'face' ? board.faceAt(coord) : board.pointAt(coord);
}

/** The subset of `Container` this needs. Narrow so tests can pass a fake. */
export interface ContainerLike<S> {
  addChild(child: S): unknown;
  removeChild(child: S): unknown;
}

/** The subset of `Sprite`/`Container` a tracked display object must satisfy. */
export interface Disposable {
  destroy(...args: never[]): void;
}

export interface SpriteLayerOptions<T, S extends Disposable> {
  board: Board;
  container: ContainerLike<S>;
  /**
   * Build the display object for a newly occupied place.
   *
   * **Position it yourself.** This layer deliberately does not, because `go`'s
   * stone shadow sits at a deliberate offset from its element and a layer that
   * "helpfully" set `position` after the fact would silently undo it.
   */
  create(occupant: Occupant<T>, element: Point | Face): S;
  /**
   * A place whose occupant changed identity -- an Othello flip, a Chess capture
   * in place. Defaults to remove-then-create, which is right whenever the two
   * occupants are different artwork.
   */
  update?(sprite: S, occupant: Occupant<T>, element: Point | Face): void;
  /**
   * Retire a departing display object. Defaults to removing it from the
   * container and destroying it.
   *
   * Override to animate an exit -- but then **you** own the teardown, including
   * the case where the exit animation is cancelled mid-flight by a scrub. `go`
   * reparents captured stones into an effects layer and destroys them when the
   * puff finishes.
   */
  remove?(sprite: S, occupant: Occupant<T>): void;
}

export interface SpriteLayer<T, S extends Disposable> {
  /**
   * Reconcile against the next board state and report what changed.
   *
   * The diff is returned rather than swallowed because *deriving* the events is
   * shared and *animating* them is not. A drop, a capture puff and a slide are
   * per-game; knowing which places gained, lost or swapped an occupant is not.
   */
  sync(next: Occupancy<T>, options?: { detectMoves?: boolean }): OccupancyDiff<T>;
  /** The display object at a coord key, if occupied. */
  get(key: string): S | undefined;
  entries(): IterableIterator<[string, S]>;
  /** Retire everything, via `remove`. */
  clear(): void;
  /** Retire everything and drop the previous state, so the next sync is a full add. */
  destroy(): void;
  readonly size: number;
}

/**
 * A keyed set of display objects kept in step with board occupancy.
 *
 * This is `go`'s `stoneMap` and `chess`'s `syncPieces` generalised. Both
 * currently rebuild or hand-diff on every step; this keeps the sprite that is
 * already correct, which is what makes an in-flight move animation survive an
 * unrelated re-render.
 *
 * ```ts
 * const stones = createSpriteLayer<CellValue, Sprite>({
 *   board,
 *   container: layers.stones,
 *   create: (occupant, element) => {
 *     const sprite = new Sprite(requireTexture(textures, stoneId(occupant.value)));
 *     sprite.anchor.set(0.5);
 *     sprite.position.set(element.x, element.y);
 *     return sprite;
 *   },
 * });
 *
 * const { added, removed } = stones.sync(occupancyFromGrid(grid, (c) => c === '.'));
 * ```
 */
export function createSpriteLayer<T, S extends Disposable>(options: SpriteLayerOptions<T, S>): SpriteLayer<T, S> {
  const { board, container, create, update, remove } = options;

  // The occupant is stored beside its display object rather than recovered from
  // the key on the way out. `coordKey` is one-way -- it joins on a comma and
  // loses the element types -- so splitting a key back apart is exactly the
  // thing the board package documents as unsupported.
  const entries = new Map<string, { sprite: S; occupant: Occupant<T> }>();
  let previous: Occupancy<T> | null = null;

  const retire = (key: string) => {
    const entry = entries.get(key);
    if (!entry) return;
    entries.delete(key);
    if (remove) remove(entry.sprite, entry.occupant);
    else {
      container.removeChild(entry.sprite);
      entry.sprite.destroy();
    }
  };

  const place = (occupant: Occupant<T>) => {
    const element = elementAt(board, occupant.coord);
    // A coord the board doesn't address is an occupancy/board mismatch -- a
    // 19x19 grid handed to a 13x13 lattice, say. Silently skipping it draws a
    // board that is quietly missing pieces, so name the coord instead.
    if (!element) {
      throw new Error(
        `[board-renderer] no ${board.primary} at coord [${occupant.coord.join(', ')}] — the occupancy ` +
          `and the board disagree about the board's size.`
      );
    }
    const sprite = create(occupant, element);
    entries.set(occupant.key, { sprite, occupant });
    container.addChild(sprite);
  };

  return {
    sync(next, syncOptions = {}) {
      const diff = diffOccupancy(previous, next, syncOptions);

      for (const occupant of diff.removed) retire(occupant.key);

      // Moves reuse the existing display object, so the caller can animate from
      // where it actually is rather than from a fresh sprite that has already
      // snapped to the destination.
      for (const move of diff.moved) {
        const arrival = next.get(coordKey(move.to));
        if (!arrival) continue;
        const entry = entries.get(coordKey(move.from));
        if (!entry) continue;
        entries.delete(coordKey(move.from));
        entries.set(arrival.key, { sprite: entry.sprite, occupant: arrival });
      }

      for (const change of diff.changed) {
        const occupant = next.get(change.key);
        if (!occupant) continue;
        const entry = entries.get(change.key);
        const element = elementAt(board, occupant.coord);
        if (update && entry && element) {
          update(entry.sprite, occupant, element);
          entries.set(change.key, { sprite: entry.sprite, occupant });
        } else {
          retire(change.key);
          place(occupant);
        }
      }

      for (const occupant of diff.added) place(occupant);

      previous = next;
      return diff;
    },
    get: (key) => entries.get(key)?.sprite,
    *entries() {
      for (const [key, entry] of entries) yield [key, entry.sprite] as [string, S];
    },
    clear() {
      for (const key of [...entries.keys()]) retire(key);
    },
    destroy() {
      this.clear();
      previous = null;
    },
    get size() {
      return entries.size;
    },
  };
}
