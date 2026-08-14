# Gamecraft skills — index

Rules for AI agents building Kaggle game visualizers with the Gamecraft design system.
Agent-agnostic markdown: works as Claude skills, Gemini context, or plain prompt attachments.

## How to locate assets

`web/design-system` is just a container directory now — it has no
`package.json` of its own. The real, independently-buildable units are its
nested workspace packages under `web/design-system/packages/*` — alongside
the separate `web/core` replay-player library. See `IMPLEMENTATION-STATUS.md`
for what's actually built vs. still aspirational in each row below.

| What | Where | Use |
| --- | --- | --- |
| Design tokens (Tailwind v4 `@theme`) | `web/design-system/packages/tokens/tokens.css` | `import "@kaggle-environments/design-system-tokens/tokens.css"` |
| Designed background art (squiggle border images) | `web/design-system/packages/tokens/images/` | referenced by `tokens.css` via relative `url()` — bundled by whichever consumer's Vite build imports `tokens.css`, no manual copying into a consuming app's `public/` needed |
| Layout variants (grid templates) | *not yet implemented* — see `layout.md` | n/a until built |
| React components (Tailwind-styled) | `web/design-system/packages/components/src/` | `import { … } from "@kaggle-environments/design-system-components"` |
| Shared utilities (`cn`, agent-brand resolution) | `web/design-system/packages/tools/src/` | `import { … } from "@kaggle-environments/design-system-tools"` |
| Component gallery (dev-only, not published) | `web/design-system/packages/components/.storybook/` | `pnpm --filter @kaggle-environments/design-system-components storybook` |
| Designed component assets (logos, avatar art) | `web/design-system/packages/components/src/assets/` | *no manifest/helper yet* — see `assets.md` |
| Layout compiler (Figma SVG → variant) | *does not exist yet* | n/a — client-drawn layouts have no path today; flag for a human |
| New app scaffold (generic boilerplate) | *does not exist yet* | new visualizers are created under `kaggle_environments/envs/<game>/visualizer/default/` via the `create-visualizer` / `new-visualizer` skills, not a `packages/create-app` scaffolder |

The stack is **Tailwind CSS v4** (CSS-first config; no `tailwind.config.*`). Tokens surface as utilities: `bg-surface-1`, `text-fg-muted`, `border-edge`, `bg-accent`, `text-player-1`, `ease-enter`, `animate-stone-place`, `duration-(--dur-medium)`. Most of these utilities aren't defined in `main.css` yet — see `IMPLEMENTATION-STATUS.md`.

## How to build a game visualizer (order matters)

0. Read `visualizer-brief.md` — fill the stepped brief FIRST. Every step is either a client-supplied artifact (Figma layouts, asset packs, animation briefs — highest authority) or a system default. No building without a brief.
1. Read `layout.md` — pick ONE layout variant by name (or the brief's compiled `custom-*` variant). Never invent a grid.
2. Read `component-selection.md` — map every UI need to an existing component.
3. Read `assets.md` — asset-first: pre-designed assets beat programmatic rendering, resolved via manifests.
4. Read `visualizer-behavior.md` — wire turn flow, scoring, end states.
5. Read `animation.md` — durations/easings come from tokens; know what earns a "moment".
6. Read `theming.md` — what you may and may not restyle.
7. Read `audio.md` — only if the game has sound.

## Hard rules (apply everywhere)

- **No raw values.** Style only with token-backed utilities plus Tailwind's default spacing/radius/text scales. Arbitrary values (`bg-[#ff0000]`, `duration-[123ms]`, `text-[13px]`) are forbidden. If the token you need doesn't exist, stop and flag it — don't hardcode.
- **No new primitives.** If a component is missing (e.g. dice), flag it for a human; don't improvise one inline.
- **Render state; don't referee.** The visualizer displays game state it is given. Game rules and legality live upstream.
- **DOM by default.** Canvas/PixiJS only for particle or heavy-animation work explicitly requested in the game brief.
- **Accessibility is non-negotiable:** DOM order = focus order, one `<GameAnnouncer>` at the root, every image-like element labelled, interactive targets ≥ 44px (components enforce this).
