# @kaggle-environments/design-system-layout-compiler

Turns a layout **drawn in Figma** into a gamecraft layout variant. Autonomous tool: no Figma API, no design-system imports — SVG in, CSS out.

## How the client draws a layout

1. In Figma, make one frame per breakpoint: **desktop and mobile required**, dense (≤500px tall homepage strip) optional.
2. In each frame, draw one rectangle per region and **name the layer** with an id of their choosing (`board`, `player_one_logo`, …). No predetermined vocabulary — but **every frame must use the same set of ids** (checked, error otherwise). Draw at component granularity: a region for the player badge, not one per badge-internal element.
3. **Describe each id** in one line — what lives in that region (e.g. `player_one_logo`: "SVG logo of the agent"). Supply as JSON via `--desc`, type into the GUI, or let the interactive CLI ask id-by-id and save the answers. Descriptions are the semantic contract; the compiler marks undescribed ids `TODO` in the spec.
3. Rectangles must tile the frame without overlapping. Edges that should align only need to be *roughly* aligned — anything within 2% of the frame size snaps to the same grid line.
4. Export each frame as SVG.

## Compile

```bash
node src/cli.mjs --name custom-blackjack \
  --desktop layout-desktop.svg --mobile layout-mobile.svg [--dense layout-dense.svg] \
  --out ../layouts/custom-blackjack.css
```

Then `@import` the generated file in the app CSS after `@kaggle-environments/design-system-layouts`, and use it like any built-in: `<div class="gc-layout" data-layout="custom-blackjack">`.

## What it does

- Parses named `<rect>`s (bare `id` or Figma's single-rect `<g id>` wrapper; translate + axis-aligned matrix transforms honoured, incl. Figma flips; frame/clip groups and unnamed background rects ignored; `_2` duplicate suffixes stripped).
- Snaps all rect edges into shared grid lines → the rects become cell spans on one grid.
- Emits `grid-template` areas per breakpoint wrapped in the standard container queries (`width < 640px`, `height < 520px`), plus a generated `.gc-slot-<id>` class per drawn id, scoped to the variant.
- Track sizing: the **hero** region (largest drawn area — usually the board) flexes with `fr` (ratios rounded: 3.09 → 3); non-flex columns are capped at their drawn width via `fit-content(px)` so long text wraps instead of stealing space from the hero; non-flex rows stay `auto` (post-wrap vertical growth is absorbed by the hero).
- Writes a **markdown layout spec** next to the CSS: slot table with the descriptions, usage snippet, the CSS, and open flags. That file is the handoff — the next agent builds the game from it without opening Figma.

## What it refuses (errors, no output)

- Overlapping rectangles, duplicate names
- A named region that doesn't snap to a solid rectangle on the shared grid
- Different id sets across breakpoint frames
- Rotated/skewed transforms (draw axis-aligned)
- Missing desktop or mobile input
- Variant names not matching `custom-<game>`

This is the enforcement half of the layout contract: client drawings **extend the layout enum**; nothing freeform ever reaches the games. See `skills/layout.md` and `skills/game-brief.md` step 3.

## GUI

```bash
pnpm dev   # from web/design-system/packages/layout-compiler
```

Opens a playground: paste or drop the SVG export per breakpoint (fixtures pre-loaded), see the annotated drawing, the generated CSS (with errors/warnings inline), and a **live preview** — drag its corner and the container queries flip the grid between wide, narrow, and dense in real time. `copy` puts the CSS on the clipboard.

## CLI

```bash
pnpm --filter @kaggle-environments/design-system-layout-compiler example
```

Compiles `fixtures/example-{desktop,mobile}.svg` to stdout. Same engine as the GUI (`src/compile.mjs` is isomorphic; only `cli.mjs` touches the filesystem).
