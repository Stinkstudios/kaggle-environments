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

So a bare `packages/*` reference below (outside the packages that now
genuinely exist under `web/design-system/packages/`) is not a "not yet
built" gap so much as a stale path from before consolidation; the doc fix
there is a rename, not new tooling.

**Update:** `packages/layout-compiler`, `packages/create-app`, and
`packages/layouts` now exist too — `web/design-system/packages/layout-compiler`
(`@kaggle-environments/design-system-layout-compiler`, bin `gc-layout`),
`web/design-system/packages/create-app`
(`@kaggle-environments/design-system-create-app`, bin `gc-new-app`), and
`web/design-system/packages/layouts`
(`@kaggle-environments/design-system-layouts`, the real `.gc-layout`/
`.gc-grid`/`.gc-slot-*` CSS `layout.md` describes). All three are genuinely
functional — not stubs. They were originally wired against a different,
hypothetical repo layout (`@gamecraft/*` names, `packages/*` at the repo
root); every `@gamecraft/*` reference across all three packages (templates,
READMEs, generated markdown) plus the general skill docs
(`component-selection.md`, `theming.md`, `layout.md`) has since been renamed
to the real `@kaggle-environments/design-system-*` names, and the two wrong
relative paths in `create-app`'s scaffolded `game.css`/`tsconfig.json`
(assumed `packages/` at the repo root instead of
`web/design-system/packages/`) are fixed too — verified by re-scaffolding a
test app and re-running the layout compiler against its fixtures. See "Ran
the new-visualizer flow" below for what's fixed vs. what still isn't.

## Per-file gap

| Doc | Describes | Actually exists |
|---|---|---|
| `README.md` | ~~Monorepo split: `packages/tokens`, `packages/layouts`, `packages/components`, `packages/assets`, `packages/layout-compiler`, `packages/create-app`~~ — **fixed**: now points at `web/design-system` and flags the layout system, layout compiler, asset manifest, and app scaffolder as not-yet-built | Matches reality. |
| `visualizer-brief.md` | `<game-dir>/visualizer/<version>/BRIEF.md` intake; Figma→CSS via `gc-layout` compiler (`@kaggle-environments/design-system-layout-compiler`) | `gc-layout` (the compiler) genuinely exists and works (`web/design-system/packages/layout-compiler`); `gc-new-app` genuinely writes `BRIEF.md` at that exact path now — both package name and location in this doc are correct. See "Ran the new-visualizer flow" below. |
| `layout.md` | Named layout enum (`table`, `versus-vertical`, `arena`, `side-panel`) via `.gc-layout`/`.gc-grid`/`.gc-slot-*` classes from `@kaggle-environments/design-system-layouts` | **Now real** — `web/design-system/packages/layouts` (`@kaggle-environments/design-system-layouts`) defines exactly these 4 variants with wide/narrow/dense container-query grids, matching this doc's table, and the package name in this doc is correct. Only remaining gap: `layouts.css` references `var(--color-bg)`/`var(--color-fg)`, which don't exist in `tokens.css` (only `--color-black/white/grey/dark-grey/highlight-blue` do) — every layout renders unstyled until that's fixed. |
| `component-selection.md` | 10 components incl. `PlayingCard`, `CardHand`, `BoardGrid`, `Stone`, `ScoreValue`, `TurnIndicator`, `InfoPopup`, `Modal`, `GameAnnouncer` | The roster shrank further, not grown: `Button`, `Badge`, and `Card` were removed (deleted from disk, mid-rework — the user's own in-progress change) since the previous pass of this doc. Only `PlayerBadge` and `SvgSprite` exist now (`web/design-system/packages/components/src/components/index.ts`); the doc has been rewritten to say so plainly rather than list a stale roster as if available. Everything else — including `Button` once it comes back, since it may look different — is a flagged gap, not an assumption. |
| `assets.md` | `packages/assets/cards/` + generated `manifest.json` + `cardImage()` helper, 40 card faces | `web/design-system/packages/components/src/assets/` has only player badge/reflection webp + one icon sprite. No cards, no manifest, no helper (path is a rename per architecture note; the manifest/helper/card files themselves are still missing). |
| `visualizer-behavior.md` | Turn flow / scoring / game-end conventions, entirely in terms of the missing components (`TurnIndicator`, `ScoreValue`, `Modal`, `GameAnnouncer`) | Not implementable until those components exist. |
| `animation.md` | Duration tokens + easing utilities (`ease-enter`, `ease-move`, `ease-spring`, `animate-stone-place`) | Duration vars mostly exist in `main.css` (though `--dur-moment` is 1300ms there vs. "≈900ms" in the doc), but none of the named easing utilities or the stone-place keyframe exist. |
| `theming.md` | 4 override hooks (`--color-accent`, `--color-board`, `--color-board-line`, `--color-card-back`) plus a large "never override" token set (`bg-surface-*`, `fg*`, `player-1..4`, etc.) | `main.css` only defines `--color-black/white/grey/dark-grey/highlight-blue` + radii/fonts/durations. None of the theming-doc's tokens exist. |
| `audio.md` | Per-game `public/audio/manifest.json` convention | Self-contained convention, no path dependency — basically fine as written, just needs an example path anchored to `visualizer/default/public/`. |

## Ran the new-visualizer flow — what actually breaks

`.agents/skills/new-visualizer/SKILL.md` is still the 3-line stub — it
doesn't mention `gc-new-app`, `gc-layout`, or any of the three new packages,
so there's no real skill to "run" yet. Tracing through what the new
packages' own READMEs document instead, and actually executing both CLIs
against this repo (twice — before and after the naming/path fixes below)
surfaced one root cause repeated everywhere: **the new packages were
authored against a different, hypothetical repo layout** (`@gamecraft/*`
package names, `packages/*` at the repo root, apps at `apps/<name>/`) **that
doesn't match this repo** (`@kaggle-environments/design-system-*` names,
packages nested under `web/design-system/packages/`, real visualizers at
`kaggle_environments/envs/<game>/visualizer/default/`).

**Fixed** (verified by re-scaffolding a test app with
`node web/design-system/packages/create-app/src/cli.mjs --name test-game
--layout table` and re-running `gc-layout` against its fixtures — inspected
the actual output both times):

- Every `@gamecraft/*` reference — dependency names in the scaffolded
  `package.json` (`@gamecraft/components/layouts/tokens` →
  `@kaggle-environments/design-system-components/-layouts/-tokens`),
  `@import`s in `game.css`, the import in `App.tsx`, `create-app`'s and
  `layout-compiler`'s own READMEs, `layout-compiler`'s generated CSS/markdown
  output, and the general skill docs (`component-selection.md`,
  `theming.md`, `layout.md`) — now use the real
  `@kaggle-environments/design-system-*` names throughout.
- `@gamecraft/assets` specifically had no real target (no `-assets` package
  exists or is planned at that name — assets live inside
  `packages/components/src/assets/`) — dropped from the scaffolded
  `package.json`'s dependencies rather than renamed to a still-nonexistent
  package.
- **`gc-new-app` now targets the real convention, not `apps/<name>/`.**
  `--game-dir <existing game dir>` replaces `--name`/`--dir` — a visualizer
  always attaches to a game that's already in `kaggle_environments/envs/`,
  so scaffolding a new top-level app was never the right shape. Writes into
  `<game-dir>/visualizer/<version>/`, the same `visualizer/` root every real
  visualizer already uses, and never touches the hand-built `default/`
  variant sitting alongside it. `pnpm-workspace.yaml` needed no change —
  the existing `kaggle_environments/envs/*/visualizer/*` and
  `.../open_spiel_env/games/*/visualizer/*` globs already match any
  subfolder name, `default` or otherwise.
- **New `--version` flag, defaulting to auto-increment.** Scans
  `<game-dir>/visualizer/` for existing `v1`, `v2`, … and picks the next one
  (`v1` if none exist), so repeat test scaffolds — the normal way to
  exercise this flow — don't clobber each other or `default/`. Pass
  `--version` explicitly (with `--force`) to target a specific one.
- **Found and fixed a real naming collision this surfaced.** The scaffolded
  package name is derived from `--game-dir`'s basename (snake_case
  normalized to kebab-case, `open-spiel-` prefixed when nested under
  `open_spiel_env`), matching the real convention exactly — e.g.
  `@kaggle-environments/open-spiel-nine-mens-morris-visualizer`. First
  attempt used that name unconditionally, which meant a `v1` scaffold got
  the *exact same* package name as the existing `default/` visualizer.
  pnpm resolved this ambiguously: `pnpm --filter <name> dev` matched both
  packages and started two dev servers fighting over the same port —
  observed directly, not just reasoned about. Fixed: only `version ===
  "default"` gets the bare name; every other version gets a `-<version>`
  suffix (e.g. `...-visualizer-v1`).
- The two wrong relative paths are fixed too, and now computed per-scaffold
  instead of hardcoded — `game.css`'s `@source` and `tsconfig.json`'s
  `include` both need the relative path back to
  `web/design-system/packages/components/src`, but the correct depth
  differs between a regular game (`kaggle_environments/envs/<game>/visualizer/<version>/`)
  and an OpenSpiel one (two levels deeper, under `open_spiel_env/games/`) —
  a single hardcoded relative path could never be right for both shapes.

Verified end-to-end, not just read through: scaffolded
`kaggle_environments/envs/open_spiel_env/games/nine_mens_morris/visualizer/v1/`
for real, wired real `PlayerBadge`s into the `opponent`/`player` slots
(everything else stayed a flagged TODO — `BoardGrid`/`TurnIndicator`/etc.
don't exist), ran it live, confirmed no console errors and correct
`versus-vertical` grid behavior.

**Still broken / still open** — none of these are naming or location
issues, so they weren't in scope of the passes above:

- **References components that don't exist.** The scaffolded `App.tsx`
  imports `GameAnnouncer` and `InfoPopup` — correctly named now, but neither
  is built yet (same gap the `component-selection.md` row above tracks).
- **`layouts.css` depends on undefined tokens** — see the `layout.md` row
  above (`--color-bg`/`--color-fg` don't exist in `tokens.css`).
- **No root `pnpm new-app` script.** `create-app/README.md` shows the
  intended shorthand; no such script exists in the root `package.json`. The
  actual entry point today is
  `node web/design-system/packages/create-app/src/cli.mjs --game-dir ... --layout ...`
  or `pnpm --filter @kaggle-environments/design-system-create-app exec
  gc-new-app -- --game-dir ... --layout ...`.
- **Toolchain version drift.** The template's `package.json` still pins
  `react@^19`, `vite@^7`, `@vitejs/plugin-react@^5`, `tailwindcss@^4.1` —
  every other package in this repo is on `react@^18.2`, `vite@^5.0`,
  `tailwindcss@^4.3.3`. `@kaggle-environments/design-system-components`
  declares `peerDependencies: { react: ^18.0.0 }`, which `^19.0.0` violates
  outright.
- **`assets.md` still references `@gamecraft/assets`** (`packages/assets/`
  + a `build-manifest` script) — left alone since, same as the scaffolded
  app's dependency above, there's no real package to rename it to; this is
  the pre-existing `assets.md` gap, not a naming-pass miss.
- **`--out` mode's exit code.** `gc-layout --out ...` exits non-zero (3,
  observed) whenever there are warnings (missing descriptions, no dense
  frame) even though it successfully writes both files — a script gating on
  exit code would treat a normal "TODO, please fill in descriptions" run as
  a failure.

## Separately worth knowing

`nine_mens_morris` already has a working visualizer at
`kaggle_environments/envs/open_spiel_env/games/nine_mens_morris/visualizer/default/`
— built the old way (standalone Vite app, own `renderer.ts`/`style.css`, no
dependency on `@kaggle-environments/design-system` at all). So today there
are two unreconciled patterns in the repo: the old per-game hand-rolled Vite
visualizer, and this new, mostly-unbuilt shared design system.

## Net assessment

The layout system, layout compiler, and app scaffolder all went from
"doesn't exist" to "genuinely built, functional, and verified end-to-end"
this round — a real jump from the ~10-15% estimate this doc previously
carried. Both blocking issues found along the way are now fixed: the
naming/path mismatch (`@gamecraft/*`, `packages/*` at the root) throughout
the packages and skill docs that reference them, and the wrong scaffold
target (`apps/<name>/` instead of `<game-dir>/visualizer/<version>/`,
including the package-name collision that location change surfaced). A
real scaffold — `nine_mens_morris`'s `visualizer/v1`, with `PlayerBadge`
wired into it — installs and runs live with no console errors. What's left
is a smaller set of real gaps: two undefined CSS custom properties, a
still-missing root script, toolchain version drift, and the pre-existing
component/asset/theming/animation gaps this file already tracked. See "Ran
the new-visualizer flow" above for the full fixed-vs-open breakdown.

## Next steps (not yet decided)

- Decide, per doc, whether to trim to current reality (safe for an agent to
  follow today) or keep the target architecture with paths corrected and a
  built-vs-planned marker per item.
- Add `--color-bg`/`--color-fg` to `tokens.css` (or change `layouts.css` to
  use tokens that already exist) so a scaffolded app isn't unstyled by
  default.
- Align `create-app`'s template toolchain versions (`react@^19`, `vite@^7`,
  `tailwindcss@^4.1`) with the rest of the repo (`react@^18.2`, `vite@^5.0`,
  `tailwindcss@^4.3.3`) — the react mismatch violates `components`'
  peerDependency range outright.
- Add a root `pnpm new-app` script if `create-app`'s documented
  `pnpm new-app --game-dir ... --layout ...` invocation is meant to keep
  working as written.
- Once the docs are trustworthy, replace `.agents/skills/new-visualizer/SKILL.md`'s
  stub body with a real process that routes into them.
