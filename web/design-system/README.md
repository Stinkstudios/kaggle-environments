# @kaggle-environments/design-system

Shared design tokens and Tailwind-based components for kaggle-environments
visualizers, plus a browsable showcase for previewing them.

## Development

```
pnpm --filter @kaggle-environments/design-system dev
```

Opens the showcase app (`src/dev/index.tsx`) with live-editing of tokens and
components.

## Structure

- `src/styles/main.css` - the design tokens (colors, radius, font family),
  defined as CSS custom properties in a Tailwind v4 `@theme` block. This is
  the single source of truth - there is no `tailwind.config.js`. Spacing and
  font-size intentionally use Tailwind's built-in defaults rather than
  redefining them. Preflight and utilities are scoped under the
  `#kaggle-design-system` selector so they can't leak into or be leaked into
  by a visualizer's own styles - consumers must render an element with that
  id around anything using this package's components (see below).
- `src/components/` - Tailwind-styled React components (`Button`, `Badge`,
  `Card`), built with `class-variance-authority` for variants and a `cn()`
  helper (`clsx` + `tailwind-merge`) for class composition/overrides.
- `src/dev/` - the showcase app entry point (not part of the published
  package).
- `src/index.ts` - the public entry point.

## Using it in a visualizer

This package ships pre-compiled output, so it needs to be built once before a
visualizer can consume it:

```
pnpm --filter @kaggle-environments/design-system build
```

Then, in a visualizer's `package.json`:

```json
"dependencies": {
  "@kaggle-environments/design-system": "workspace:*"
}
```

Import the stylesheet once (e.g. in `main.tsx`), give your app root
`id="kaggle-design-system"`, and use the components:

```tsx
import '@kaggle-environments/design-system/style.css';
import { Button } from '@kaggle-environments/design-system';

createRoot(container).render(
  <div id="kaggle-design-system">
    <Button>Play</Button>
  </div>
);
```

The `font-sans` token is Inter. This package doesn't inject the font itself -
add the stylesheet link to the visualizer's own `index.html` (see this
package's `index.html` for the exact tags), the same way the chess visualizer
does it.

Unlike `@kaggle-environments/core`, this package does not resolve to source
in dev mode - it ships compiled Tailwind CSS, so consuming a built `dist` is
required rather than optional. After changing tokens or components, rerun the
`build` command above to pick up the changes in other visualizers.
