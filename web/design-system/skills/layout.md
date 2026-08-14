# Skill: layout

Layout is an **enum, not a canvas**. Pick one named variant from `@gamecraft/layouts`, put content in its semantic slots, done. You never write `grid-template-areas`, never position absolutely, never invent breakpoints.

## Picking a variant

| Game shape | Variant |
| --- | --- |
| 2-player board game (chess, go, checkers, hex) | `versus-vertical` |
| 2-seat card game with a shared table (blackjack) | `table` |
| Board is the hero, wide embed | `side-panel` |
| 3+ players (poker) | `arena` |
| Client supplied Figma layout frames | compile to `custom-<game>` per `visualizer-brief.md` step 3 (ids are free-form; each gets a prompter-supplied description; output includes a markdown spec), then build from that spec like a built-in |
| Anything else | STOP — ask a human; do not improvise |

## Structure

```tsx
<div className="gc-layout" data-layout="table">
  <div className="gc-grid">
    <div className="gc-slot-opponent">{/* dealer badge + hand */}</div>
    <div className="gc-slot-board">{/* shared table */}</div>
    <div className="gc-slot-player">{/* your badge + hand */}</div>
    <div className="gc-slot-hud">{/* TurnIndicator, ScoreValue, InfoPopup */}</div>
    <div className="gc-slot-controls">{/* action Buttons */}</div>
  </div>
</div>
```

## Slot contents (fixed meanings)

- `board` — the play area only. Nothing else ever goes here.
- `player` / `opponent` — `<PlayerBadge>` (+ hand for card games). In `arena`, `opponent` holds a flex row of badges.
- `hud` — `<TurnIndicator>`, standalone scores, move counter, `<InfoPopup>`. Read-only info.
- `controls` — `<Button>`s and the replay scrubber. Interactive only.

## Responsive: already solved

Each variant ships **wide / narrow / dense** grids via container queries. Narrow = container < 640px wide. Dense = container < 520px tall (the Kaggle homepage 500px strip). You do not add media queries; you get all three by using the variant.

Rules that keep this working:

- The layout container must be able to size itself: give `.gc-layout`'s parent a real height (100% chain or fixed).
- Board content must scale: use `aspect-ratio` + `max-width`/`max-height` (BoardGrid does this), never fixed px sizes.
- DOM order inside `.gc-grid` = the order shown above = focus order. Don't reorder DOM to move things visually — that's what the variant's grid does.
- Never hide slots in dense mode yourself; the variant already compresses. If content genuinely can't fit, shorten content (drop `meta` lines), not structure.

## Text never resizes the layout

Long text (agent model names, localized strings, verbose metadata) must not grow a track and steal space from the board. The system enforces this in layers; keep all three intact:

- **Grids cap columns.** Compiled variants size non-flex columns as `fit-content(<drawn px>)` — text wraps at the drawn width. Rows may grow after wrapping (the flexing hero absorbs it).
- **Components truncate.** `PlayerBadge` name/meta and `TurnIndicator` text ellipsize (full value in `title`). Don't undo this; don't render raw model ids where a display name exists.
- **Your text follows the same rules:** single-line UI text gets `truncate` (+ `title` when truncation loses information); multi-line explanatory text gets `line-clamp-2`; numbers are `tabular-nums` so scores don't jitter widths; never widen a slot to fit text. If text is routinely clipped, the fix is shorter copy or a bigger drawn region — a client/design decision, not a CSS workaround.
