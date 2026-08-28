# `@kaggle-environments/design-system-board-renderer`

Draws a [`@kaggle-environments/board`](../../../board) with PixiJS.

`board` is geometry — coords ⇄ pixels, fitting, adjacency, diffing — and has no
runtime dependencies at all. This package is the other half: the Pixi app, the
layers, the texture loading, and the per-step bookkeeping that `chess` and `go`
currently each write for themselves.

It has no opinion about what a piece looks like. That stays per-game,
permanently.

## What it replaces

Comparing `go/src/graphics/` and `chess/src/graphics/` as they stand today:

| | `go` | `chess` |
|---|---|---|
| `app.init` with the same six options | ✓ | ✓ |
| `touch-action` canvas fix ([pixi#4824](https://github.com/pixijs/pixijs/issues/4824)) | ✓ | ✗ |
| Guard against unmount during async init | ✓ | ✗ |
| `loadGameTextures` over the asset families | ✓ | ✓ |
| Named layer containers in z-order | ✓ | ✓ |
| Grid lines / tile fills | ✓ | ✓ |
| Four-sided coordinate labels | ✓ | ✓ |
| In-flight animation set, cancelled per update | ✓ | ✓ |
| Keyed sprite reconciliation | `stoneMap` | `syncPieces` |
| coord → pixel math | `gridToPixel` | `squareToPixel` |

The last row is `board`'s job now. The rest is this package's. The two ✗ rows
are real bugs `chess` picks up for free by adopting it.

`go` has been migrated onto this package (see below); `chess` has not yet.

## Primitives first

Every piece stands alone. Use one, use all of them, or use none and keep your
own bring-up — the geometry works either way.

```ts
const stage = await createStage(canvas, { layers: ['board', 'pieces'], width: 512, height: 512 });
const textures = await loadFamilies([goFamily, fxFamily], { mipmaps: true });

stage.layers.board.addChild(drawGrid(board));
stage.layers.board.addChild(drawLabels(board, { offset: 25, text: … }));
```

- **`createStage`** — `Application`, named layers in a fixed z-order, `devicePixelRatio`,
  the touch-action fix, and an `AbortSignal` for the unmount-during-init case.
- **`loadFamilies`** — asset families → textures keyed by stable id (`'go:b-stone'`),
  never by filename. `requireTexture` throws instead of drawing Pixi's white box.
- **`drawGrid` / `drawFaces` / `drawFaceSprites` / `drawBorder`** — board furniture, straight from the geometry.
- **`drawLabels`** — coordinate labels off `board.sides`.

`drawGrid` and `drawLabels` are thin wrappers over `latticeStrokes` and
`labelPlacements`, which live in `@kaggle-environments/board` — see below.
- **`createSpriteLayer`** — display objects kept in step with occupancy.
- **`createAnimationSet`** — in-flight animations, cancelled as a group.

## …and one wrapper over them

`createBoardRenderer` wires the common case and hands back the raw `app` and
`layers`, so the interesting parts of a game stay reachable:

```ts
const board = squareLattice({ points: { rows: 19, cols: 19 }, fit: { width: 512, height: 512, padding: 56 } });

const renderer = await createBoardRenderer(canvas, {
  board,
  layers: ['board', 'shadows', 'stones', 'effects'],
  families: [goFamily, fxFamily],
  mipmaps: true,
  signal: controller.signal,
});

const stones = renderer.spriteLayer<CellValue, Sprite>('stones', {
  create: (occupant, element) => {
    const sprite = new Sprite({ texture: renderer.texture(stoneId(occupant.value)), anchor: 0.5 });
    sprite.position.set(element.x, element.y);
    return sprite;
  },
});

const { added, removed } = stones.sync(occupancyFromGrid(grid, (cell) => cell === '.'));
```

The canvas is sized from the board unless you say otherwise: a board fitted with
`padding` is centred in its box, so the margin it left on one side recovers the
original box. Go's 512 box with 56 padding gives a 400 extent at origin 56, and
`56 * 2 + 400` is 512.

## The pure derivations are not here

`latticeStrokes` and `labelPlacements` contain no rendering logic at all, so they
live in `@kaggle-environments/board` and this package deliberately does **not**
re-export them. Import them from there.

That split is not tidiness. They started here, and it made them unreachable for
the renderers that need them most: this package imports `pixi.js` at module
scope, so a Canvas2D renderer could not touch them without pulling a WebGL
renderer into its bundle. The evidence is in the ported Canvas2D visualizers —
`nine_mens_morris` hand-rolls `latticeStrokes` as its own `deriveLines`, and
`havannah` hand-rolls `labelPlacements` against `fillText`. Roughly 17 renderers
copy that fitting-and-labelling math, and only the two PixiJS ones could have
reached a version locked behind a Pixi import.

## Drawing the lattice

### Board line styles

How a board's lines look is the design system's call, not each game's. `drawGrid`
takes a **named style**, and the style owns the metrics:

```ts
drawGrid(board, { style: 'plain', crisp: true });                  // chess's 1px grid
drawGrid(board, { style: 'squiggle-dash', textures });             // go's hand-drawn line
```

`squiggle-dash` tiles a strip along each merged run, deriving the line height
from `tileScale` so the brush keeps its aspect and never stretches. Those
numbers — tile scale, height, anchor, rotation — used to be spelled out in `go`'s
`drawBoard.ts`; restyling every board is now a change here rather than a change
in N renderers.

The style resolves **its own artwork** (`board:squiggle-dash`) from a loaded
texture map, so a caller only has to have loaded the shared `board` family. Pass
`texture` instead to override it.

Two naming notes, both cheap now and expensive later:

- The asset lives in the shared **`board`** family, not `go`'s. Board furniture
  is not any one game's art, and filing it per-game is exactly what stopped
  `chess` from reaching the line `go` draws.
- The `-dash` suffix is deliberate. The same hand-drawn set has a solid variant
  (`squiggle-solid.png`, 165×4, already in `design-system-tokens` for the DOM),
  so a bare `squiggle` would need renaming across every board the moment it lands.

The Pixi path rotates one strip per run, so it needs no vertical variant. The DOM
`.squiggle-border` does carry a `squiggle-v.png`, because CSS cannot rotate a
background image — don't pack one into the atlas out of symmetry with the CSS.
That tokens copy of the artwork is a deliberate duplicate; tokens is
self-contained by design.

`chess` draws `plain` and `go` draws `squiggle-dash`, and nothing has yet decided
whether that difference is intentional. The `Board line styles` Storybook entry
puts them side by side so the call can be made by looking.

### Hex cell styles

Where the lines *are* the cell, the artwork is too. `drawFaceSprites` places one
sprite per face:

```ts
drawFaceSprites(board, { textures });                          // hex-half-solid, the default
drawFaceSprites(board, { style: 'hex-half-dash', textures });  // the dashed set
drawFaceSprites(board, { style: 'hex-solid', textures });      // one cell, drawn whole
```

Four styles: `hex-solid` / `hex-dash` draw the whole outline, `hex-half-solid` /
`hex-half-dash` draw three contiguous edges. **The default is `hex-half-solid`**
— a board almost always wants a half, and the whole outline is really only right
for a cell shown on its own.

This is a separate function from `drawGrid` rather than another `GridStyleName`,
because the two consume different geometry. `drawGrid` tiles a strip along the
merged runs of `latticeStrokes`; `board:hex-solid` is a *closed outline* with no
run to tile it along. It walks `board.faces` instead.

One master serves both orientations. `hexRotation` reads the turn off the
polygon's own corners — 0 for a pointy-top board, 30 degrees for a flat-top one
— rather than off a board field, because `Board` does not carry the orientation
it was generated with. A flipped or third-party lattice therefore still gets art
that lines up. That is the same call the squiggle strip makes by rotating per
run instead of shipping a vertical copy.

### Halves, and why they are the default for a board

A whole outline per cell draws every interior edge twice — 462 of 552 edges on a
size-8 Havannah board. That is worse for `dash` than for `solid`: two doubled
solid strokes merge into one slightly heavier line, but two doubled dashed
strokes arrive at different phases and interleave, because the two cells present
opposite edges of the artwork to the same lattice edge and traverse them in
opposite directions.
`hex-half-solid` carries three contiguous edges instead, and the three
neighbours draw the rest: each shared edge lands exactly once, for half the
sprites. Verified across every extent, both orientations and a flipped board.

The other half is the same file turned 180 degrees; there is no second asset.

What one half per cell *cannot* cover is an erased edge with no neighbour behind
it, so half the board's outline goes missing. `closeBoundary` (default true)
draws the complement on those cells. It re-doubles any of that cell's other
erased edges that do have a neighbour — 42 of 552 edges, against 462 — and that
is the price of working in halves rather than single edges. Set it false when
the game draws its own border off `board.sides`, which every hex game here does.

Two implementation notes, both load-bearing:

- **The fit constant is per master, not global.** `hex-solid` is 302×348 with
  the ink flush to the edges; `hex-dash` is 304×353 with a little padding, and
  its stroke centreline sits at a different fraction of the canvas (0.9641 vs
  0.9754). Using one number for both would draw the dashed board 1.2% small and
  reopen the gap at every shared edge. A `-half-` variant is cut from its whole
  counterpart, so it inherits that canvas and that number. If future variants are
  exported from a shared artboard this collapses back to one constant.
- **The atlas must stay untrimmed.** The fit maps the master's *canvas* to the
  cell, so a trimmed frame would scale and seat the art wrongly — and the half
  is mostly empty canvas, so it is the first thing to break. `allowTrim: false`
  in `assetpack.config.mjs` is what holds this up.
- **`hexRotation` biases its half-step comparison.** A flat-top board lands
  exactly on the boundary, where floating-point noise otherwise sends some faces
  to +30 degrees and the rest to −30. Both draw an identical hexagon, so a whole
  outline never notices; a half does, and a board mixing them tiles wrong.

Two things to know before using it:

- **Interior edges are drawn twice** with `hex-solid`, once by each of the two cells that share
  them, and two hand-drawn strokes do not coincide. That is the cell-by-cell
  look the artwork is going for, but it does weight interior lines more heavily
  than the boundary. How much that actually shows depends entirely on `scale`
  being right: at the wrong fit the two strokes separate into tram-lines, and at
  `HEX_ART_FIT` they overlap into one slightly heavier line. Judge it at the
  correct fit. `Hex cell styles → AgainstProgrammatic` puts it beside the
  `drawFaces` stroke so the call can be made by looking.
- **`scale` defaults to `HEX_ART_FIT` (≈1.025), not 1.** The master is cropped
  to the *outside* of a stroke with real width, so fitting the raw canvas to the
  cell draws the hexagon at 97.5% and leaves a visible gap at every shared edge.
  The constant is measured off the artwork — the alpha-weighted mean projection
  onto each of the six edge normals, which agree to within 0.24% — and seats the
  stroke's centreline on the cell boundary so neighbours meet. Pass `scale: 1`
  to see the uncorrected fit; `Hex cell styles → Overlap` slides across it.

`hex-dash` is declared in `families.json` but not drawn yet, so it lands in the
`board` family's `missing[]` and `loadFamilies` warns about it in dev. That is
the roster doing its job — pass `onMissing` to quieten it.

### Which drawer

`drawGrid` strokes the lattice's **edges**; `drawFaces` and `drawFaceSprites`
draw its **cells** — programmatically and from artwork respectively.
Which you want is the same question `board.primary` already answers — Go and
Nine Men's Morris draw lines, Chess and every hex game draw cells. A hex board
emits no edges at all, so `drawGrid` on one correctly draws nothing.

`latticeStrokes` (in `board`) is the pure core, and it merges collinear runs: a
19×19 Go board has 684 unit edges but 38 lines. Flat strokes look identical either way, so this
would be pointless if that were the only consumer — it isn't. `go` draws each
line as a `TilingSprite` of a brush texture, and 684 sprites would re-tile the
brush at every intersection.

## Positioning is yours

`createSpriteLayer` never sets a sprite's position, and never moves one. It
tracks, adds, reuses and retires; **where a piece is** is the animation the game
owns. `go`'s stone shadow sits at a deliberate offset from its element, and a
layer that "helpfully" wrote `position` after `create` would silently undo it.

`sync` returns the diff for the same reason: deriving the events is shared,
drawing them is not. A drop, a capture puff and a castling slide are per-game;
knowing which places gained, lost or swapped an occupant is not.

Move detection is off by default. It is only correct where pieces travel — a Go
capture is a removal, a Chess move is a move.

## Animation library

None, deliberately. `createAnimationSet` accepts anything with `stop()` or
`kill()`, which covers `motion` (chess) and `gsap` (go) without dragging a
second animation library into every visualizer that adopts this.

Keep looping animations in their own set. `go`'s atari wobble repeats forever,
so clearing it alongside the one-shot drops would restart the loop every step.

## Commands

```bash
pnpm --filter @kaggle-environments/design-system-board-renderer test        # vitest, node, no jsdom
pnpm --filter @kaggle-environments/design-system-board-renderer tsc
pnpm --filter @kaggle-environments/design-system-board-renderer build
pnpm --filter @kaggle-environments/design-system-board-renderer storybook   # port 6007
```

Tests here cover sprite reconciliation and animation bookkeeping, in plain Node
with no GPU. Stroke merging and label placement are tested in `board`, alongside
the code. The drawing itself is proven in Storybook, against a Go board, a Chess
board, Hex, Havannah, Y and Nine Men's Morris. If a test here ever needs jsdom,
something has leaked into the wrong module.

## What the `go` migration actually cost

`go/visualizer/default/src/graphics/` went from **1116 to 1018 lines** — 98 net,
not the several hundred a glance at the duplication table suggests. Worth being
precise about, because the shape of the saving is not what you would guess:

| | Before | After | |
|---|---:|---:|---|
| `textures.ts` | 60 | — | deleted; `loadFamilies` |
| `diffGrids.ts` | 29 | — | deleted; `diffOccupancy` via the sprite layer |
| `drawBoard.ts` | 97 | 74 | `latticeStrokes` + `drawLabels` |
| `constants.ts` | 125 | 112 | lost `getCellSize`/`gridToPixel`/`getNeighbors` |
| `stoneMap.ts` | 74 | 76 | takes a `Point` instead of `(row, col, boardSize)` |
| `marker.ts` | 90 | 91 | `coordKey` instead of its own `posKey` |
| `GoPixi.ts` | 279 | **303** | **grew** |
| `animateStones.ts` | 362 | 362 | untouched |

`GoPixi` grew because a sprite layer's `create`/`remove` hooks are more verbose
than the inline bookkeeping they replace, and go's stones are *pairs* — a stone
in one layer, its shadow in another — which the hooks have to marry up by hand.

So the case for adopting this is **not** line count. It is that the deleted 89
lines were duplicated verbatim in `chess`, that the bring-up and scrub-safety
logic now has one implementation instead of two, and that a new visualizer
starts from a working board instead of from `go`'s copy of one.

The port was verified by pixel-diffing the board against the pre-migration build
on the same replay at the same step, with reduced motion forcing every animation
to snap: **zero differing pixels** in the board region.

## Not here yet

`chess` still has its own bring-up. Non-uniform pitch (`quoridor`'s wall gaps)
and banded layouts (`backgammon`) aren't modelled by the geometry, so they stay
bespoke here too. Resizing resizes the drawing surface only — refitting means a
new `Board`, and whether that is a redraw or a rebuild is game-specific.
