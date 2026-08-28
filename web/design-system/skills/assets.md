# Skill: assets

**Asset-first.** When a pre-designed asset exists, use it — never redraw, restyle, or "improve" it programmatically. Programmatic rendering is the fallback for gaps only.

## Where assets live

`web/design-system/packages/assets` (`@kaggle-environments/design-system-assets`).

```
src/<family>/<id>.png     the artwork — committed
families.json             the roster: which ids exist, labels, a11y decisions
packed/<family>/          committed build output
  <family>.webp             the sheet
  <family>.webp.json        frame table (untrimmed)
  <id>.webp                 only for families with "individual": true
  manifest.json             ids, labels, frames, missing[]
```

The **manifest — not the directory listing** — is the source of truth. Resolve
through the API, never by guessing file paths:

```ts
import { pieceAsset, pieceFamily, missingPieces } from '@kaggle-environments/design-system-assets';

pieceAsset('chess:w-king')   // → PieceAsset | null
pieceFamily('card')          // → atlas + pieces + missing[]
```

Or in DOM, just use the component, which picks the right path itself:

```tsx
import { Piece } from '@kaggle-environments/design-system-components';
<Piece id="card:a-spade" size="lg" />
```

## Import the families you draw, not the package root

**A Pixi game imports per family. Always.**

```ts
import goFamily from '@kaggle-environments/design-system-assets/go';
import fxFamily from '@kaggle-environments/design-system-assets/fx';
```

The package root is a barrel over every family. It exists for consumers that
genuinely resolve arbitrary ids — the DOM `<Piece>` component and the Storybook
gallery — and it cannot be tree-shaken: one module holds static imports of every
atlas and all 54 card faces, referenced from a single object literal, so a
bundler must keep the lot. Importing `pieceFamily` from the root once put 1.28MB
of artwork into the go visualizer, 1.16MB of it the playing-card deck, for a
board that draws nine sprites.

Filtering at runtime does not help. A list of family names controls what gets
*loaded into Pixi*; the bundle is decided by what gets *imported*. Naming each
family as an import is what makes the two agree — and makes the cost visible in
the diff when someone adds a family to a game.

Each per-family module default-exports a ready `FamilyInfo` (atlas, pieces,
`missing[]`), so there is nothing to resolve by name:

```ts
const { atlasUrl, atlasData, pieces, missing } = goFamily;
```

## Families

| Family | ids | Output | Notes |
| --- | --- | --- | --- |
| `chess` | `chess:{w,b}-{king,queen,rook,bishop,knight,pawn}` | atlas | 256×256, 12 pieces |
| `board` | `board:dark-tile`, `board:squiggle-dash`, `board:hex-solid` | atlas | shared board furniture; mixed sizes. `board:hex-dash` declared, **not yet drawn** |
| `fx` | `fx:puff1-3` | atlas | shared decorative particles |
| `chess-fx` | `chess-fx:{squiggle-1-3,rook1-4,bishop1-2,pawn,knight-shadow}` | atlas | chess-only, game-scoped |
| `go` | `go:{b,w}-{stone,marker,territory}`, `go:{shadow,hoshi}` | atlas | go-only, game-scoped; mixed sizes |
| `card` | `card:<rank>-<suit>`, `card:back`, `card:joker` | individual | 462×643, 54 pieces — **artwork not yet added** |

Card ids: rank `a, 2…10, j, q, k` (`10`, not `t`); suit singular lowercase
(`spade`, `heart`, `diamond`, `club`). So `card:a-spade`, `card:10-heart`,
`card:k-club`.

## Serving both renderers

A family declares which renderers it serves:

```json
"targets": ["pixi", "dom"]
```

**An atlas serves both.** Pixi loads it as a `Spritesheet`; DOM positions it with
CSS `background-position` (frames are packed untrimmed precisely so this needs
no offset maths). It's the same URL, so the browser fetches it once even when a
Pixi board and DOM chrome in the same visualizer both use it. This is the
default and it needs no thought.

**Individual files serve DOM only.** A family sets `"individual": true` to emit
one file per piece, and `"atlas": false` to skip the sheet. Pixi cannot consume
an atlas-less family — the build **refuses** `targets: ["pixi"]` with
`atlas: false`, and the Pixi loader throws rather than rendering an empty board.

| Family | Output | Targets |
| --- | --- | --- |
| `chess`, `board`, `fx`, `chess-fx`, `go` | atlas | pixi + dom |
| `card` | individual | dom |

Cards are DOM-only because every card game here is DOM and shows a hand at a
time — fetching 54 faces to display five would be wasteful. If a Pixi card game
appears, add `"pixi"` to targets and set `"atlas": true`: all 54 fit a single
4096px sheet at 419×583 (9×7 = 63 slots, 91% of source), so it's a modest
downscale, not a multi-page rebuild. Keep `"individual": true` alongside it so
the DOM games don't regress.

## Shared vs game-scoped families

A family in this package is a claim that its art is **reusable**. Art that only
one game uses gets a game-scoped family name — `chess-fx`, not `fx`.

The test is evidence, not intent: the three `fx` puffs are byte-identical
between the chess and go visualizers, which is what earns them a shared family —
and both now load them from `fx` rather than each carrying its own copy.
Everything else chess uses for motion (`rook1-4`, `bishop1-2`, `pawn`,
`knight-shadow`, `squiggle-1..3`) lives in `chess-fx`, because several of those
are literally chess piece silhouettes — filing them under a generic `fx` invites
another game to import a rook outline as "a particle".

Promote to a shared family when a second game actually needs the art, not in
anticipation that it might.

## Rules

- Pixi games import `@kaggle-environments/design-system-assets/<family>`. The
  package root is DOM-only — it bundles every family.
- Resolve through `pieceAsset()`/`pieceFamily()`, never by guessing file paths.
- Returns `null` → no asset yet. Pass it through (`<Piece>` renders its
  `fallback`); report the gap from the manifest's `missing[]`. Don't fake it,
  and never substitute a different piece's art.
- Never mix sources within one visual family in a shipped game: some cards as
  assets and others programmatic is acceptable during development and a
  **release blocker** at delivery.
- Assets keep a fixed per-family ratio and are fitted, never stretched.
- Adding a piece = drop the PNG in `src/<family>/`, declare it in
  `families.json` with a label (or `decorative: true`), rebuild. The build
  **fails** on undeclared files — every piece needs a label and an
  accessibility decision before it can ship.
- Declaring a piece *before* the artwork exists is the correct way to record a
  known gap; it lands in `missing[]`.
- Never hand-edit `manifest.json` or `src/generated/registry.ts`.

```
pnpm --filter @kaggle-environments/design-system-assets build:assets
pnpm --filter @kaggle-environments/design-system-assets check:roster   # no deps needed
```

## Known state

| Family | State |
| --- | --- |
| `chess` | complete — 12 pieces, atlas |
| `board` | complete — 1 tile, atlas |
| `fx` | complete — 3 shared puffs, atlas |
| `chess-fx` | complete — 11 chess-only particles, atlas |
| `go` | complete — 9 go-only pieces, atlas |
| `card` | complete — 54 faces, individual files, DOM-only |

Runtime tinting is not implemented; no `tintable` family exists yet. It lands
with the first one (discs).

## What to build next

Roughly six families cover the whole visualizer roster. Ordered by games served
per unit of design effort:

| Family | Games it would serve |
| --- | --- |
| **discs / stones** | othello, connect_four, checkers, clobber, nine_mens_morris, y, havannah, dark_hex, coin_game, coin_game_arena |
| **figurative** | amazons, breakthrough, lines_of_action, quoridor (chess already done) |
| **glyph tiles** | shogi (kanji), hive (hex bug tiles), dots_and_boxes |
| **dice** | backgammon |
| **chips / seeds** | repeated_poker, oshi_zumo, mancala |

Discs are far and away the best first move — one tintable disc plus a colour
token replaces hand-rolled `ctx.arc` drawing in about ten games. Go is off that
list: its stones are figurative, individually-shaded artwork rather than flat
discs, so they stay in the game-scoped `go` family even once discs exist. Agent and unit
sprites (snake, markov_soccer, capture_the_flag, ant_foraging, lux_*, halite,
kore_fleets) are deliberately out of scope: they're per-game characters, not
reusable pieces.
