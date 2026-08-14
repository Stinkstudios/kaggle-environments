# Skill: component selection

Map every UI need to an existing `@gamecraft/components` export. Zero custom UI primitives.

## Decision table

| Need | Use | Never |
| --- | --- | --- |
| A playing card | `<PlayingCard rank suit faceDown>` | hand-rolled divs, images of cards |
| Cards in a hand | `<CardHand label>` wrapping PlayingCards | manual negative margins |
| A grid board (n×m cells) | `<BoardGrid cols rows renderCell>` | tables, SVG grids |
| Round piece on a board | `<Stone player>` inside `renderCell` | emoji, images |
| A player (name/avatar) | `<PlayerBadge>` compound — see "PlayerBadge composition" below | custom cards |
| A score number | `<ScoreValue value>` | bare text (it animates changes) |
| Whose turn it is | `<TurnIndicator text player>` | text-only status |
| Game explanation | `<InfoPopup>` with 1–2 sentences | modals, long help pages |
| Game over / confirm | `<Modal open title actions>` | inline banners, window.alert |
| An action | `<Button variant>` | links, divs with onClick |
| Screen-reader updates | one `<GameAnnouncer message>` at root | multiple live regions |

## Choice-count rules

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

Dice, chips/betting stack, timer/clock, dropdown, toast, replay scrubber. If the game needs one, stop and report the gap.
