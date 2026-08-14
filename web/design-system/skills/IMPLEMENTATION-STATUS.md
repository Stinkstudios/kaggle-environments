# Gamecraft skills — implementation status

The skill docs in this directory (`README.md` and friends) describe a target
design system. This file tracks how much of that target actually exists in
this repo today, so the docs can be brought in line with reality (or the gaps
closed) before `new-visualizer` / `create-visualizer` route agents through
them.

`.agents/skills/new-visualizer/SKILL.md` is currently a 3-line stub that
points here without a real process — see "Next steps" below.

**Architecture note:** this repo intentionally moved away from a top-level
`packages/tokens` / `packages/layouts` / `packages/components` /
`packages/assets` split at the `web/` root — those specific top-level
packages don't exist. `web/design-system` itself is not a package either (no
`package.json`) — it's a plain directory grouping nested workspace packages
under `web/design-system/packages/*` (+ the separate `web/core` player
library), which is where a `tokens`/`components` split re-emerged, just
nested one level deeper than originally planned:

- `tokens` (`@kaggle-environments/design-system-tokens`) — design tokens
  (`tokens.css` at the package root, Tailwind v4 `@theme`), exported as raw
  source (no build step — `exports["./tokens.css"]` points straight at
  `tokens.css`). Its designed background art (`images/squiggle-*.png`, the
  squiggle-border images `tokens.css`'s `.squiggle-border` rule references
  via relative `url()`) lives right next to it in `packages/tokens/images/`
  — this makes the package portable: whichever consumer's own Vite build
  imports `tokens.css` bundles those images itself (inlined as `data:` URIs
  at this size), with no manual copying into a consuming app's own `public/`
  needed. This is also what fixed a pre-existing bug — the images used to
  live under `packages/preview/public/images/` while `main.css`'s relative
  `url()` pointed at a sibling `./images/` that didn't exist next to it,
  so Vite could never resolve them (silent "didn't resolve at build time"
  warning; the squiggle border simply didn't render). `tokens.css` also has
  an explicit `@source '../components/src';` directive — Tailwind's
  automatic content-detection doesn't reliably reach across a
  pnpm-symlinked package boundary in a production `vite build` (dev mode
  works fine without it; only build was affected). Any future package whose
  class names need scanning from here needs its own `@source` line.
- `components` (`@kaggle-environments/design-system-components`) — the React
  components + their own assets (logos, avatar art).
- `tools` (`@kaggle-environments/design-system-tools`) — the `cn`/agent-brand
  helpers `components` depends on.
- `preview` (`@kaggle-environments/design-system-preview`, private, unpublished)
  — the component gallery Vite app. Depends on both `components` and
  `tokens`; nothing depends on `preview`, so the graph stays acyclic. Owns
  no design assets of its own anymore — everything stylistic came from
  `tokens`.

There's no umbrella re-exporting any of this and no separately compiled
stylesheet — `components` gets its styling by whoever imports `tokens.css`
alongside it (that's `preview` today). This is intentionally the shape a
future visualizer should follow too: import both
`@kaggle-environments/design-system-components` and
`@kaggle-environments/design-system-tokens/tokens.css` in its own entry
point, and its own Vite build bundles everything (components' utility
classes + tokens' images) without needing anything copied by hand.

So a bare `packages/*` reference below (outside the four that now genuinely
exist under `web/design-system/packages/`) is not a "not yet built" gap so
much as a stale path from before consolidation; the doc fix there is a
rename, not new tooling.
`packages/layout-compiler` and `packages/create-app` are the exception —
those describe tooling (a Figma→CSS compiler, an app scaffolder) that doesn't
exist under any path yet.

## Per-file gap

| Doc | Describes | Actually exists |
|---|---|---|
| `README.md` | ~~Monorepo split: `packages/tokens`, `packages/layouts`, `packages/components`, `packages/assets`, `packages/layout-compiler`, `packages/create-app`~~ — **fixed**: now points at `web/design-system` and flags the layout system, layout compiler, asset manifest, and app scaffolder as not-yet-built | Matches reality. |
| `visualizer-brief.md` | `apps/<game>/BRIEF.md` intake; Figma→CSS via `gc-layout` compiler (`@gamecraft/layout-compiler`) | No `apps/` dir (games live at `kaggle_environments/envs/<game>/visualizer/default/`), no compiler, no `BRIEF.md` convention anywhere in the repo. |
| `layout.md` | Named layout enum (`table`, `versus-vertical`, `arena`, `side-panel`) via `.gc-layout`/`.gc-grid`/`.gc-slot-*` classes from `@gamecraft/layouts` | None of these classes or variants exist in `main.css`. No layout system at all yet — every existing visualizer hand-builds its own layout. |
| `component-selection.md` | 10 components incl. `PlayingCard`, `CardHand`, `BoardGrid`, `Stone`, `ScoreValue`, `TurnIndicator`, `InfoPopup`, `Modal`, `GameAnnouncer` | Only `Button`, `Badge`, `Card`, `PlayerBadge`, `SvgSprite` exist (`web/design-system/packages/components/src/components/index.ts`). 8 of the table's rows have no component. |
| `assets.md` | `packages/assets/cards/` + generated `manifest.json` + `cardImage()` helper, 40 card faces | `web/design-system/packages/components/src/assets/` has only player badge/reflection webp + one icon sprite. No cards, no manifest, no helper (path is a rename per architecture note; the manifest/helper/card files themselves are still missing). |
| `visualizer-behavior.md` | Turn flow / scoring / game-end conventions, entirely in terms of the missing components (`TurnIndicator`, `ScoreValue`, `Modal`, `GameAnnouncer`) | Not implementable until those components exist. |
| `animation.md` | Duration tokens + easing utilities (`ease-enter`, `ease-move`, `ease-spring`, `animate-stone-place`) | Duration vars mostly exist in `main.css` (though `--dur-moment` is 1300ms there vs. "≈900ms" in the doc), but none of the named easing utilities or the stone-place keyframe exist. |
| `theming.md` | 4 override hooks (`--color-accent`, `--color-board`, `--color-board-line`, `--color-card-back`) plus a large "never override" token set (`bg-surface-*`, `fg*`, `player-1..4`, etc.) | `main.css` only defines `--color-black/white/grey/dark-grey/highlight-blue` + radii/fonts/durations. None of the theming-doc's tokens exist. |
| `audio.md` | Per-game `public/audio/manifest.json` convention | Self-contained convention, no path dependency — basically fine as written, just needs an example path anchored to `visualizer/default/public/`. |

## Separately worth knowing

`nine_mens_morris` already has a working visualizer at
`kaggle_environments/envs/open_spiel_env/games/nine_mens_morris/visualizer/default/`
— built the old way (standalone Vite app, own `renderer.ts`/`style.css`, no
dependency on `@kaggle-environments/design-system` at all). So today there
are two unreconciled patterns in the repo: the old per-game hand-rolled Vite
visualizer, and this new, mostly-unbuilt shared design system.

## Net assessment

These docs read as a design doc for where the system is headed, at maybe
10-15% implemented. Renaming `packages/tokens` / `packages/layouts` /
`packages/components` / `packages/assets` references to `web/design-system`
is a mechanical fix (see architecture note above) — but that alone isn't
sufficient: 8 of 10 listed components, the entire layout-variant system, the
layout compiler, and the asset manifest pipeline genuinely don't exist yet,
regardless of path. Bringing the docs in line with reality means either
building those missing pieces or rewriting the docs to not assume them (or
some explicit mix, tracked per-doc above).

## Next steps (not yet decided)

- Decide, per doc, whether to trim to current reality (safe for an agent to
  follow today) or keep the target architecture with paths corrected and a
  built-vs-planned marker per item.
- Once the docs are trustworthy, replace `.agents/skills/new-visualizer/SKILL.md`'s
  stub body with a real process that routes into them.
