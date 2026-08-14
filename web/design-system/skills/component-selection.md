# Skill: component selection

Map every UI need to an existing `@kaggle-environments/design-system-components` export. Zero custom UI primitives. The component roster is small and actively changing right now — check `web/design-system/packages/components/src/components/index.ts` for what's *actually* exported before assuming anything below exists; this doc can lag the real package.

## Decision table

| Need | Use | Never |
| --- | --- | --- |
| A player (name/avatar) | `<PlayerBadge>` compound — see "PlayerBadge composition" below | custom cards |
| Icon sprite defs (once, at root) | `<SvgSprite>` | inlining `<svg>` per use |

Everything else a game needs — buttons, badges/pills, generic cards, playing cards, a board grid, board pieces, scores, turn indicators, popups, modals, screen-reader announcements — **does not exist yet**. See "Known gaps" below. Don't improvise a replacement; flag it and stop.

## Choice-count rules (once `Button` exists)

- User picks between **2–4 actions** (hit/stand): a row of `<Button>`s in `controls`. Exactly one `variant="primary"` — the most likely/forward action. Rest `secondary`.
- **5+ options**: a `<select>` (native) — flag it, a styled Dropdown is a known gap.
- Destructive/irreversible (resign, forfeit): `secondary` Button + `<Modal>` confirm.

## PlayerBadge composition

`PlayerBadge` is a compound component, not a flat-prop badge — build it from parts:

- Root `<PlayerBadge type="black"|"white" active rotate="left"|"right"|"none">`. `type` selects the black/white stone art (must match the player's `Stone`/`TurnIndicator` color). `active` swaps the label to an accent fill and scales the badge up slightly — drive this off whose turn it is, not a static "featured player" flag. `rotate` is a purely decorative tilt; skip it for dense/list layouts.
- Exactly one `PlayerBadgeIcon` and one `PlayerBadgeLabel` as direct children, in either order. Order controls which side the icon overlaps — the label reads its own position via `:first-child`/`:last-child` CSS, so don't wrap either in an extra element or the overlap breaks.
- Inside `PlayerBadgeIcon`: a `PlayerBadgeIconBackground variant="blank"|"reflection"` (`blank` for small/dense badges where it needs to read cleanly, `reflection` for a single larger/decorative badge, e.g. a versus header), optionally layered with a `PlayerBadgeLogo name="…"` on top for a provider mark (resolves brand via `getAgentBrand`).
- Inside `PlayerBadgeLabel`: a `PlayerBadgeLabelText` for the name (pass two stacked child `<span>`s for a two-line label, e.g. model name + variant). Add `PlayerBadgeLabelIcon` before it only when the icon slot is a plain game piece rather than a provider logo — don't duplicate a logo that's already shown in `PlayerBadgeIcon`.
- There are no `winner`, `meta`, or `score` props. Score belongs in `ScoreValue` next to the badge; a "winner" ribbon/state is a known gap — flag it rather than inventing a prop.

## Player identity

- Player index (1–4) drives all player color: badges, stones, turn dots. Same entity = same index everywhere, entire game.
- Index 1 = first player / "you" when there's a local perspective. Never reassign mid-game.

## Known gaps (flag, don't improvise)

Nothing here has a component yet — including `Button`, which existed before but was pulled while it's reworked, so don't assume it's stable even once it reappears. Check `index.ts` for the current truth.

| Need | Was / will be | Status |
| --- | --- | --- |
| An action | `Button` | removed for rework — was `<Button variant>` |
| A pill/label | `Badge` | removed for rework |
| A generic container | `Card` | removed for rework |
| A playing card | `PlayingCard` | never built |
| Cards in a hand | `CardHand` | never built |
| A grid board (n×m cells) | `BoardGrid` | never built |
| Round piece on a board | `Stone` | never built |
| A score number | `ScoreValue` | never built |
| Whose turn it is | `TurnIndicator` | never built |
| Game explanation | `InfoPopup` | never built |
| Game over / confirm | `Modal` | never built |
| Screen-reader updates | `GameAnnouncer` | never built |
| Dice, chips/betting stack, timer/clock, dropdown, toast, replay scrubber | — | never built |

If the game needs any of these, stop and report the gap — don't hand-roll a substitute, even a small one.
