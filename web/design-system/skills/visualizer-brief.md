# Skill: visualizer brief — the stepped intake

Building a game visualizer starts with a **brief**, filled in steps. Each step has two paths: the client **supplies an artifact** (highest authority) or the system **defaults** kick in. The agent never invents a third path. Ambiguity is removed step by step *before* code is written; the finished brief is the build contract.

Work through the steps in order. Record the answer to every step in `apps/<game>/BRIEF.md` so the build is reproducible and reviewable.

## Step 1 — Game identity

- **Client supplies:** game name, player count, seat semantics (who is "you"), 1–2 sentence explanation (this becomes the `<InfoPopup>` text verbatim).
- **Default:** none. This step cannot be defaulted; ask.

## Step 2 — Data contract

- **Client supplies:** replay/state JSON sample or transformer schema (`@kaggle-environments/core` shape).
- **Default:** none for live games. For a design-only prototype, a scripted state sequence is allowed but must be labelled as scripted.

## Step 3 — Layout

- **Client supplies (option A):** a layout drawing — Figma frames of named rectangles, one frame per breakpoint (**desktop and mobile required, dense optional**), exported as SVG. Layer names are free-form ids chosen by the client (`player_one_logo`, `board`, …); every frame must place the same ids.
  - Run **`@kaggle-environments/design-system-layout-compiler`** (`web/design-system/packages/layout-compiler`): `gc-layout --name custom-<game> --desktop d.svg --mobile m.svg [--dense dense.svg] --desc descriptions.json --out ../layouts/custom-<game>.css`. It snaps rect edges into grid lines, emits `grid-template` areas wrapped in the standard container queries, and generates a `.gc-slot-<id>` class per drawn id. Do not hand-derive grids from the drawing — the compiler is the only path.
  - **Every id needs a one-line description of what lives in that region** (e.g. `player_one_logo`: "SVG logo of the agent"). Ask the prompter about each undescribed id **individually** — one question per id, no batching — then record the answers (`descriptions.json`; the CLI does this Q&A itself when run interactively).
  - The compiler emits a **markdown layout spec** (`custom-<game>.md`) alongside the CSS: slot table with descriptions, usage snippet, the CSS itself, and open flags. That spec is the handoff — the next agent builds the game from it without seeing Figma. A spec containing `TODO — description missing` is not ready for handoff.
  - Compiler errors (overlaps, non-rectangular regions, mismatched ids across frames) go back to the client to fix in Figma; don't patch the generated CSS. No dense frame → warning; get one drawn or add the dense block by hand *with human review*.
  - Once registered, the variant is part of the enum; the game consumes it exactly like a built-in (`data-layout="custom-<game>"`). The freeform-layout ban (skills/layout.md) still holds — Figma input *extends the enum*, it doesn't bypass it.
- **Default (option B):** pick the nearest built-in variant per `skills/layout.md` (blackjack → `table`, chess → `versus-vertical`, …).

## Step 4 — Theme

- **Client supplies:** values for the four override hooks (`--color-accent`, `--color-board`, `--color-board-line`, `--color-card-back`), e.g. from Figma styles.
- **Default:** stock tokens, no overrides. Either way: nothing beyond the four hooks (skills/theming.md).

## Step 5 — Assets

- **Client supplies:** designed asset packs (cards, pieces, backgrounds) dropped into `packages/assets/<family>/` + manifest regeneration.
- **Default:** existing families (asset-first, skills/assets.md); programmatic fallback for gaps, with the gap list attached to the brief.

## Step 6 — Motion & signature effects

- **Client supplies:** a written animation brief — piece/element "personalities" ("the rook charges in and destroys"), named moments, particle effects. This is the ONLY source that can authorize PixiJS effects.
- **Default:** built-in component motion + the duration/easing rules of `skills/animation.md`. No particles, no signature effects.

## Step 7 — Audio

- **Client supplies:** audio files + `manifest.json` per `skills/audio.md`.
- **Default:** silent game.

## Output

The completed `BRIEF.md` lists, per step: source (client artifact vs default), the artifact reference (Figma URL, file paths), and open flags (asset gaps, unmapped regions, missing tokens). An agent handed a completed brief should be able to build the visualizer without asking a single question — if it can't, the brief format is missing a step; report that.
