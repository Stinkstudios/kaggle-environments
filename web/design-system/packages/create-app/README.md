# @kaggle-environments/design-system-create-app

Scaffolds a new game visualizer: generic Vite/React/Tailwind v4 boilerplate wired to one
`@kaggle-environments/design-system-layouts` variant, plus a blank `BRIEF.md`. Contains no game-specific
content — it's the app-structure equivalent of `@kaggle-environments/design-system-layout-compiler`, not a
copy of an existing game.

## Use

```bash
node web/design-system/packages/create-app/src/cli.mjs \
  --game-dir kaggle_environments/envs/open_spiel_env/games/nine_mens_morris \
  --layout versus-vertical
```

Run from the repo root. `--game-dir` is the *existing* game's directory — a visualizer always
attaches to a game that's already in `kaggle_environments/envs/`, so this never invents a new
top-level app. It writes into `<game-dir>/visualizer/<version>/`, the same `visualizer/` root every
real visualizer already uses (typically alongside a hand-built `default/` — this script never
touches it). `--layout` must be one of the built-ins (`versus-vertical`, `table`, `side-panel`,
`arena`) or a `custom-<game>` variant already compiled by
`@kaggle-environments/design-system-layout-compiler` — see `skills/layout.md`. There is no default; layout
is picked deliberately, never invented.

```
gc-new-app --game-dir <path> --layout <variant> [--version vN] [--force]
```

- `--version` — which `visualizer/` subfolder to write, e.g. `v1`. Defaults to the next unused
  `vN` (scans `<game-dir>/visualizer/` for existing `v1`, `v2`, … and picks one past the highest) so
  repeat test scaffolds don't clobber each other or the real `default/` variant. Pass it explicitly
  to target a specific version, e.g. to overwrite one with `--force`.
- `--force` — overwrite files if the target version directory already exists.

The scaffolded package name follows the same convention every real visualizer already uses:
`@kaggle-environments/<game>-visualizer`, or `@kaggle-environments/open-spiel-<game>-visualizer` when
`--game-dir` is under `open_spiel_env` — derived from `--game-dir`'s basename (snake_case directory
names are normalized to kebab-case), not a separate `--name` flag, so it can't drift from the game
it's attached to.

## What it writes

```
<game-dir>/visualizer/<version>/
  BRIEF.md          # skills/game-brief.md, steps 1-7, blank except layout (already chosen)
  package.json      # @kaggle-environments/[open-spiel-]<game>-visualizer, same deps as every other app
  vite.config.ts
  tsconfig.json
  index.html
  src/
    main.tsx
    game.css        # tokens + layouts imports, Tailwind @source path
    App.tsx          # gc-layout skeleton: all 5 slots present, each a TODO
                      # pointing at skills/component-selection.md — no game logic
```

After scaffolding:

1. Fill in `BRIEF.md` — every other skill step assumes a completed brief.
2. `pnpm install` (from repo root).
3. `pnpm --filter @kaggle-environments/[open-spiel-]<game>-visualizer dev`.

## Templates

Source of truth is `templates/`, copied verbatim with tokens substituted in:
`__GAME_NAME__` (kebab-case), `__PACKAGE_NAME__` (the full scoped package name), `__GAME_TITLE__`
(Title Case), `__COMPONENT_NAME__` (PascalCase), `__LAYOUT__`, and
`__COMPONENTS_SRC_FROM_APP_ROOT__`/`__COMPONENTS_SRC_FROM_SRC_DIR__` (the relative path back to
`packages/components/src`, computed per-scaffold since it varies with how deep `--game-dir` nests —
never hardcode a fixed `../../..` in a template). Edit templates there when the shared app
scaffolding itself needs to change (e.g. a new package dependency every app should have) — not
per-app.
