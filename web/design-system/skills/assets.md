# Skill: assets

**Asset-first.** When a pre-designed asset exists, use it — never redraw, restyle, or "improve" it programmatically. Programmatic rendering is the fallback for gaps only.

## Where assets live

`packages/assets/` (`@gamecraft/assets`), one directory per asset family, each with a generated `manifest.json` describing every file. The manifest — not the directory listing — is the source of truth an agent reads.

| Family | Directory | Helper |
| --- | --- | --- |
| Playing card faces | `cards/` (555×776 PNG, 5:7) | `cardImage(rank, suit)` → URL or `null` |

## Rules

- Resolve through the helper/manifest, never by guessing file paths. Filename contract for cards: `<rank>-<suit>.png`, rank `a,2..10,j,q,k`, suit singular lowercase.
- Helper returns `null` → no asset yet. Pass it through anyway (`image={cardImage(rank, suit)}`); components fall back to programmatic rendering. Report the gap (the manifest's `missing` list) — don't fake the asset.
- Never mix sources within one visual family in a game: if some cards in play would be assets and others programmatic fallbacks, that's acceptable during development but must be flagged as a blocker for delivery.
- Assets are full-bleed: components crop with `object-cover` to the family's fixed ratio. Never stretch (`object-fill`) or letterbox.
- New/renamed files: run `pnpm --filter @gamecraft/assets build-manifest` to regenerate the manifest. Never hand-edit `manifest.json`.
- Adding a new family = new directory + manifest generation + helper + row in the table above. That's a human-approved design-system change, not something to improvise mid-game-build.

## Known state

Cards: ranks 2–10 + ace, all four suits (40 files). **Face cards J/Q/K have no assets yet** — they render programmatically until designed. Card backs: no asset yet, programmatic back (`bg-card-back`).

## Performance note

Source PNGs are ~700KB each. Fine for local dev; before production delivery they need an optimization pass (resize to display density, WebP/AVIF). Don't do this ad hoc per game — it belongs in the assets package build.
