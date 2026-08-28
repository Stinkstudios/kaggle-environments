import { describe, expect, it, vi } from 'vitest';
import { occupancyFromGrid, squareLattice, type Occupant } from '@kaggle-environments/board';
import { createSpriteLayer, elementAt, type ContainerLike } from './sprites';

/** Stands in for a Pixi Sprite: destroyable, and records where it was put. */
class FakeSprite {
  destroyed = false;
  constructor(
    public value: unknown,
    public x: number,
    public y: number
  ) {}
  destroy() {
    this.destroyed = true;
  }
}

function fakeContainer() {
  const children: FakeSprite[] = [];
  return {
    children,
    addChild: (child: FakeSprite) => children.push(child),
    removeChild: (child: FakeSprite) => children.splice(children.indexOf(child), 1),
  } satisfies ContainerLike<FakeSprite> & { children: FakeSprite[] };
}

const EMPTY = '.';
const grid = (rows: string[]) =>
  occupancyFromGrid(
    rows.map((row) => [...row]),
    (cell) => cell === EMPTY
  );

function setup(rows = 3, cols = 3) {
  const board = squareLattice({ points: { rows, cols } });
  const container = fakeContainer();
  const layer = createSpriteLayer<string, FakeSprite>({
    board,
    container,
    create: (occupant, element) => new FakeSprite(occupant.value, element.x, element.y),
  });
  return { board, container, layer };
}

describe('createSpriteLayer', () => {
  it('adds a sprite per occupant, positioned from the resolved element', () => {
    const { container, layer } = setup();

    layer.sync(grid(['B..', '.W.', '...']));

    expect(container.children).toHaveLength(2);
    expect(layer.get('0,0')).toMatchObject({ value: 'B', x: 0, y: 0 });
    expect(layer.get('1,1')).toMatchObject({ value: 'W', x: 1, y: 1 });
  });

  it('keeps the sprite that is already correct across a sync', () => {
    const { layer } = setup();

    layer.sync(grid(['B..', '...', '...']));
    const first = layer.get('0,0');
    layer.sync(grid(['B..', '.W.', '...']));

    // A rebuild-every-step renderer would replace this, cancelling any
    // animation already running on it.
    expect(layer.get('0,0')).toBe(first);
    expect(first!.destroyed).toBe(false);
  });

  it('destroys and unparents a departed occupant by default', () => {
    const { container, layer } = setup();

    layer.sync(grid(['B..', '...', '...']));
    const stone = layer.get('0,0')!;
    layer.sync(grid(['...', '...', '...']));

    expect(stone.destroyed).toBe(true);
    expect(container.children).toHaveLength(0);
    expect(layer.size).toBe(0);
  });

  it('hands a departure to `remove` instead, leaving teardown to the caller', () => {
    const board = squareLattice({ points: { rows: 3, cols: 3 } });
    const container = fakeContainer();
    const remove = vi.fn();
    const layer = createSpriteLayer<string, FakeSprite>({
      board,
      container,
      create: (occupant, element) => new FakeSprite(occupant.value, element.x, element.y),
      remove,
    });

    layer.sync(grid(['B..', '...', '...']));
    const stone = layer.get('0,0')!;
    layer.sync(grid(['...', '...', '...']));

    // go reparents a captured stone into an effects layer for the puff, so it
    // must still be alive and still parented here.
    expect(remove).toHaveBeenCalledWith(stone, expect.objectContaining({ key: '0,0', value: 'B' }));
    expect(stone.destroyed).toBe(false);
    expect(container.children).toContain(stone);
  });

  it('replaces the sprite when an occupant changes identity in place', () => {
    const { layer } = setup();

    layer.sync(grid(['B..', '...', '...']));
    const before = layer.get('0,0')!;
    const diff = layer.sync(grid(['W..', '...', '...']));

    expect(diff.changed).toEqual([{ key: '0,0', coord: [0, 0], from: 'B', to: 'W' }]);
    expect(before.destroyed).toBe(true);
    expect(layer.get('0,0')!.value).toBe('W');
  });

  it('lets `update` retint an in-place change rather than rebuilding it', () => {
    const board = squareLattice({ points: { rows: 3, cols: 3 } });
    const container = fakeContainer();
    const layer = createSpriteLayer<string, FakeSprite>({
      board,
      container,
      create: (occupant, element) => new FakeSprite(occupant.value, element.x, element.y),
      // An Othello flip is the same disc, so keeping it is what lets the flip
      // be animated rather than cut.
      update: (sprite, occupant) => {
        sprite.value = occupant.value;
      },
    });

    layer.sync(grid(['B..', '...', '...']));
    const disc = layer.get('0,0')!;
    layer.sync(grid(['W..', '...', '...']));

    expect(layer.get('0,0')).toBe(disc);
    expect(disc.destroyed).toBe(false);
    expect(disc.value).toBe('W');
  });

  it('rekeys the same sprite across a detected move', () => {
    const { layer } = setup();

    layer.sync(grid(['B..', '...', '...']));
    const piece = layer.get('0,0')!;
    const diff = layer.sync(grid(['...', '.B.', '...']), { detectMoves: true });

    expect(diff.moved).toEqual([{ from: [0, 0], to: [1, 1], value: 'B' }]);
    // Reused, not rebuilt -- so the caller can tween it from where it is. Its
    // position is still the origin square, deliberately: this layer never moves
    // a sprite, because that is the animation the game owns.
    expect(layer.get('1,1')).toBe(piece);
    expect(layer.get('0,0')).toBeUndefined();
    expect(piece.destroyed).toBe(false);
    expect(piece).toMatchObject({ x: 0, y: 0 });
  });

  it('reports a Go capture as a removal, since moves are off by default', () => {
    const { layer } = setup();

    layer.sync(grid(['B..', '...', '...']));
    const diff = layer.sync(grid(['...', '.B.', '...']));

    expect(diff.moved).toEqual([]);
    expect(diff.removed.map((o) => o.key)).toEqual(['0,0']);
    expect(diff.added.map((o) => o.key)).toEqual(['1,1']);
  });

  it('names the coord when the occupancy outgrows the board', () => {
    const { layer } = setup(3, 3);

    expect(() => layer.sync(grid(['...', '...', '...', '..B']))).toThrow(/no point at coord \[3, 2\]/);
  });

  it('clears without parsing keys back into coords', () => {
    const { container, layer } = setup();
    const removed: Occupant<string>[] = [];
    const board = squareLattice({ points: { rows: 3, cols: 3 } });
    const tracked = createSpriteLayer<string, FakeSprite>({
      board,
      container,
      create: (occupant, element) => new FakeSprite(occupant.value, element.x, element.y),
      remove: (_sprite, occupant) => removed.push(occupant),
    });
    void layer;

    tracked.sync(grid(['B..', '.W.', '...']));
    tracked.clear();

    // The occupant is carried alongside the sprite, so `remove` still gets a
    // real coord array rather than a string split on commas.
    expect(tracked.size).toBe(0);
    expect(removed.map((o) => o.coord)).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it('treats a sync after destroy as a fresh board', () => {
    const { layer } = setup();

    layer.sync(grid(['B..', '...', '...']));
    layer.destroy();
    const diff = layer.sync(grid(['B..', '...', '...']));

    expect(diff.added.map((o) => o.key)).toEqual(['0,0']);
    expect(layer.size).toBe(1);
  });
});

describe('elementAt', () => {
  it('resolves against the kind the board is played on', () => {
    const points = squareLattice({ points: { rows: 19, cols: 19 } });
    const cells = squareLattice({ cells: { rows: 8, cols: 8 } });

    expect(elementAt(points, [0, 0])!.kind).toBe('point');
    expect(elementAt(cells, [0, 0])!.kind).toBe('face');
    // A Go board's coords stop at 18; a hardcoded faceAt would have found the
    // 18x18 cell lattice underneath and drawn a stone half a square off.
    expect(elementAt(points, [18, 18])!.kind).toBe('point');
    expect(elementAt(cells, [8, 8])).toBeNull();
  });
});
