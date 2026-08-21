# @kaggle-environments/design-system-assets

Shared game-piece artwork — chess pieces, stones, cards, dice, chips, tiles —
with one source of truth and one packed output that both render targets read.

See `../../skills/assets.md` for the usage rules and the family roadmap.

## Layout

```
src/<family>/<id>.png     the artwork — committed, the design deliverable
families.json             the roster: which ids exist, labels, a11y decisions
        │  pnpm build:assets
        ▼
packed/<family>/          committed build output
  <family>.webp             the sheet
  <family>.webp.json        frame table (untrimmed)
  manifest.json             ids, labels, frames, missing[]
src/generated/registry.ts literal-import table consumers resolve through
```

Scratch, never committed: `.packer-work/` (staging in, raw packer output out),
`.assetpack/` (packer cache), `dist/` (tsc/vite output).

## Atlas by default

Both targets read the one sheet — Pixi via `Spritesheet`, DOM via CSS
`background-position`. Frames are packed **untrimmed** specifically so the DOM
path works without re-applying offsets. A chess board showing 32 pieces costs a
single request.

A family can additionally emit one file per piece by setting `"individual": true`
in `families.json`. That's for families like **cards**, where you show one face
at a time and pulling a 52-card sheet to do it would be wasteful. `<Piece>`
prefers the standalone file when it exists and falls back to the sheet otherwise
— callers don't choose.

## Usage

```ts
import { pieceAsset, pieceFamily } from '@kaggle-environments/design-system-assets';

// Pixi
const { atlasUrl, atlasData } = pieceFamily('chess');
const sheet = new Spritesheet(await Assets.load(atlasUrl), atlasData);
await sheet.parse();

// DOM — or just use <Piece id="chess:w-king" /> from design-system-components
const { url, atlasUrl, atlasSize, frame, label } = pieceAsset('chess:w-king');
```

`pieceAsset()` returns `null` when artwork doesn't exist yet. Pass the null
through to a programmatic fallback and report the gap — never substitute a
different piece's art. `missingPieces()` gives the full list for a dev warning.

## What is and isn't committed

| Path | Committed | Why |
|---|---|---|
| `src/<family>/*.png` | yes | the artwork |
| `families.json` | yes | the roster, labels, a11y decisions |
| `packed/<family>/` | yes | sheet, frame table, manifest |
| `src/generated/registry.ts` | yes | the import table |
| `.packer-work/`, `.assetpack/`, `dist/` | no | scratch and build output |

Committing the packed output follows what this repo has always done — both the
chess and go visualizers track `sprites.json` and `sprites.webp` under `src/`.
It also means a fresh clone renders without anyone running the packer, which
matters because the packer needs `sharp`'s native binding and that isn't
available everywhere.

## Build

Only needed when artwork or `families.json` changes:

```
pnpm --filter @kaggle-environments/design-system-assets build:assets
```

Requires `@assetpack/core` (a devDependency, installed with the workspace).
To audit the roster without packing — no dependencies needed:

```
pnpm --filter @kaggle-environments/design-system-assets check:roster
```

`exports` mirrors `@kaggle-environments/core`: the `development` condition
resolves to `./src/index.ts`, so **dev needs no build at all**. Production
resolves `import` to `./dist/`, built by `pnpm build-all`'s step 1.

## Adding a piece

1. Drop the PNG in `src/<family>/<id>.png`.
2. Declare it in `families.json` with a `label` (or `decorative: true`).
3. Run `build:assets`.

The build **fails** on any file that isn't declared — every piece needs a label
and an accessibility decision before it can ship. Declaring a piece before the
artwork exists is the correct way to record a known gap: it lands in the
manifest's `missing[]` rather than silently not existing.

## Why one sheet per family, not per game

Each family packs to its own sheet rather than one sheet per game. That costs
nothing in Pixi: the chess visualizer already renders tiles, pieces and
particles into separate containers (`background`, `pieces`, `vfx`), so they were
never in one draw batch anyway. Packing by family is what makes a family
reusable across games.

## Known gaps

- Only `chess`, `board` and `fx` families exist. Discs/stones, cards, dice and
  chips are the next highest-value families (discs alone serve ~10 games).
- Runtime tinting isn't implemented — no `tintable` family exists yet.
- Source artwork is 256×256, inherited from the existing chess originals. The
  RFC proposes 512 for new families.
