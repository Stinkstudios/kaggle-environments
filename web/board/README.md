# `@kaggle-environments/board`

Board geometry for game visualizers: coords ⇄ pixels, fitting, adjacency, hit-testing,
and state diffing. **No runtime dependencies** — not React, not Pixi, not the DOM — so
the PixiJS visualizers (`chess`, `go`) and the Canvas2D ones consume the identical
`Board` object.

It has no opinion about what a piece looks like. That stays per-game, permanently.

## The idea

A board is **points**, **edges** and **faces**, and which of those a generator emits
carries information:

| Game | Plays on | Generator |
|---|---|---|
| Chess, Othello | faces | `squareLattice({ cells: { rows: 8, cols: 8 } })` |
| Go | points | `squareLattice({ points: { rows: 19, cols: 19 } })` |
| Dots & Boxes | edges | `squareLattice({ cells: { rows: 7, cols: 7 } })` |
| Dark Hex, Havannah, Y | faces | `hexLattice({ extent: 'rhombus' \| 'hexagon' \| 'triangle', … })` |
| Nine Men's Morris | points | `graphLattice({ nodes, segments })` |

The first three are the *same lattice read at three different element kinds*. A hex board
emits no points, because there are no intersections to play on. An irregular graph emits
no faces. Absence is meaningful — check `board.faces.length`, don't assume.

## Fitting

```ts
const board = squareLattice({
  points: { rows: 19, cols: 19 },
  fit: { width: 512, height: 512, padding: 56 },
});

board.scale;              // 22.2 — final units per lattice step
board.pointAt([3, 15]);   // { x, y, … } in final coordinates
board.origin;             // top-left of the board's own extent
board.width;              // the board's extent — not the box it was centred in
board.pitch;              // derive stone radii, line widths and font sizes from this
```

This replaces the `padding → innerW/innerH → cellSize = min(...) → centred origin` block
currently copy-pasted into ~17 renderers. It reproduces `go`'s `gridToPixel`, `chess`'s
`squareToPixel` and `dots_and_boxes`'s fitting math exactly — there are tests asserting
that against the real constants.

**Omit `fit` and you get unit space**: `scale` is 1, one lattice step is one unit, the
board starts at the origin. That is what the tests assert against, with no renderer and
no DOM.

`fit.padding` is space reserved *outside* the board, for coordinate labels.
`fit.minScale` is the floor several renderers already apply as `Math.max(12, …)`; a
clamped board may overflow its box, which is the existing behaviour.

## Hit-testing

```ts
board.hitTest(x, y);                        // defaults to board.primary
board.hitTest(x, y, { kinds: ['edge'] });   // Dots & Boxes plays on edges
```

Faces use exact containment; points and edges use nearest-within-bound (half a pitch and
a third of a pitch respectively). Consistent with the forward transform by construction,
since both read the same laid-out geometry. Every element of a square, Go and hexagon
board round-trips in the tests.

Currently a linear scan — fine for a click handler on a 361-point board, worth a spatial
index if it ever runs per-frame.

## Adjacency

```ts
board.neighborsOf(board.pointAt([9, 9])!);   // 4, via edges
board.neighborsOf(board.faceAt([0, 0])!);    // 6, via shared polygon sides
```

Prebuilt at construction: a flood fill over a 19×19 Go board is 361×684 iterations if
this is recomputed per call. Face adjacency snaps near-identical corner positions onto
shared vertices with a tolerance, so it holds up against `cos`/`sin` rounding.

For `graphLattice`, **segments define adjacency**, so pass the fine-grained links (`0-1`,
`1-2`) rather than one long stroke spanning three points (`0-2`). Collinear short
segments draw identically, so nothing is lost.

## Board outline

```ts
board.sides;    // compass-named groups, clockwise from the top
board.corners;  // the extreme elements where two sides meet
```

Connection games are why this is geometry rather than per-game code, and
`havannah/…/renderer.ts` currently hand-rolls it as a `classifyCell` helper:

| Game | Needs |
|---|---|
| Hex | which cells are the `n`/`s` edge (Player X) versus `e`/`w` (Player O) |
| Havannah | its 6 corners (bridge) and 6 sides (fork) |
| Y | its 3 sides |

A corner cell satisfies two sides and so appears in **both** `sides` groups as
well as in `corners` — which is what Hex wants. Havannah's fork rule says
"corner cells do NOT count as edges", so it subtracts `corners` itself.

Each group also carries `segments`: the outward-facing polygon facets, ready to
stroke as a goal marker. A facet is a board boundary exactly when only one face
touches it, so these fall out of the same table adjacency uses. Where a corner
cell's facets face two different ways, each is assigned to whichever of its
sides points the same way. Boards whose primary element is a point (Go, an
irregular graph) get `elements` but no `segments` — there are no polygons to
take a facet from.

## Diffing

```ts
const prev = occupancyFromGrid(prevGrid, (cell) => cell === '.');
const next = occupancyFromGrid(nextGrid, (cell) => cell === '.');

diffOccupancy(prev, next);                        // { added, removed, changed, moved }
diffOccupancy(prev, next, { detectMoves: true }); // pairs a departure with an arrival
```

`occupancyFromGrid` bridges from the `Cell[][]` shape every transformer already emits;
keys match `coordKey([row, col])`. Move detection is off by default because it is only
correct where pieces travel — a Go capture is a removal, a Nine Men's Morris slide is a
move.

## Addressing

Address by `coord`. **Never parse an `id`** — ids are opaque and stable, useful as a Map
key or a Pixi child name, nothing more.

## Commands

```bash
pnpm --filter @kaggle-environments/board test   # vitest, node environment, no jsdom
pnpm --filter @kaggle-environments/board tsc    # typechecks src and tests
pnpm --filter @kaggle-environments/board build
```

If a test ever needs jsdom, something has leaked into the wrong entry point.

## Not here yet

The canvas host — creation scoped to a parent, `devicePixelRatio` scaling,
`ResizeObserver` — lands as a separate `./canvas` entry point in the next phase, so this
one stays usable from PixiJS. Non-uniform pitch (`quoridor`'s wall gaps) and banded
layouts (`backgammon`) are not modelled; those stay bespoke.
