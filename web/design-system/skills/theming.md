# Skill: theming

One design language, small per-game accent surface. Consistency across games beats per-game personality. Stack is Tailwind v4: tokens live in `@gamecraft/tokens` as `@theme` values; you style with the utilities they generate.

## May override (per game, scoped to `.gc-layout`)

| Token | Utility it feeds | What it themes |
| --- | --- | --- |
| `--color-accent` | `bg-accent`, `text-accent`, rings | Highlight/primary color |
| `--color-board` | `bg-board` | Board/table background |
| `--color-board-line` | `border-board-line` | Grid lines |
| `--color-card-back` | `bg-card-back` | Card back |

```css
/* game.css — the ONLY custom CSS a game may add */
.gc-layout[data-game="blackjack"] {
  --color-board: #1b3a2d; /* deep felt green */
  --color-board-line: #2c5343;
}
```

Override values must keep contrast: content on `--color-board` renders in `--color-fg` (near-black ink) — keep the surface light (avoid mid/dark tones).

## Never override

- Neutrals (`bg`, `surface-*`, `edge`), text colors (`fg*`), status colors (`positive/negative/warning`)
- Player colors (`player-1..4`) — cross-game consistency + color-blind-safe pairs
- Typography, spacing, radii, shadows, easings, durations
- Focus ring / active glow

## No arbitrary values

`bg-[#123456]`, `text-[13px]`, `duration-[400ms]` — forbidden everywhere. If a value has no token/utility, that's a design-system gap: flag it, don't mint it.

## Paper & ink only

Light "paper & ink" is canonical — the language of the shipped Chess and Go visualizers: warm paper background (`bg`, flat fallback for the paper texture), near-black ink (`fg`) for text AND borders, hard offset shadows, light-blue accent wash for active states, Mynerve for handwritten accents. There is no dark theme in v1; don't build one speculatively.
