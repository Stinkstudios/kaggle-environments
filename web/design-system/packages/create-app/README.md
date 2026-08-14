# @kaggle-environments/design-system-create-app

Scaffolds a new game app: generic Vite/React/Tailwind v4 boilerplate wired to one
`@kaggle-environments/design-system-layouts` variant, plus a blank `BRIEF.md`. Contains no game-specific
content — it's the app-structure equivalent of `@kaggle-environments/design-system-layout-compiler`, not a
copy of an existing game.

## Use

```bash
pnpm new-app --name blackjack --layout table
```

Run from the repo root (the script writes into `apps/<name>/` relative to `cwd`).
`--layout` must be one of the built-ins (`versus-vertical`, `table`, `side-panel`,
`arena`) or a `custom-<game>` variant already compiled by
`@kaggle-environments/design-system-layout-compiler` — see `skills/layout.md`. There is no default; layout
is picked deliberately, never invented.

```
pnpm new-app --name <game> --layout <variant> [--dir apps] [--force]
```

- `--dir` — parent directory for the new app, default `apps`.
- `--force` — overwrite files if the target directory already exists.

## What it writes

```
apps/<name>/
  BRIEF.md          # skills/game-brief.md, steps 1-7, blank except layout (already chosen)
  package.json      # @kaggle-environments/<name>, same deps as every other app
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
3. `pnpm --filter @kaggle-environments/<name> dev`.

## Templates

Source of truth is `templates/`, copied verbatim with `__GAME_NAME__` (kebab-case),
`__GAME_TITLE__` (Title Case), `__COMPONENT_NAME__` (PascalCase), and `__LAYOUT__`
substituted in. Edit templates there when the shared app scaffolding itself needs
to change (e.g. a new package dependency every app should have) — not per-app.
