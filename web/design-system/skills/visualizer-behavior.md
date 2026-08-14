# Skill: visualizer behavior

How game state maps to UI, for every game. The visualizer **renders state it is given** — it never computes legality, scores, or outcomes.

## Turn flow

- During play, **exactly one** `<PlayerBadge active>` at any time — the player to act. On turn change, move `active`; the glow transition is built in.
- Show `<TurnIndicator>` in the `hud` slot mirroring the same fact ("Gemini to move"). Badge + indicator always agree.
- While an agent is "thinking" (move pending), TurnIndicator text becomes "… is thinking". Don't add spinners elsewhere.
- A move being made animates on the acting element (card flips, stone places) — see `animation.md`. Never teleport state.

## Scoring

- Scores live in `<ScoreValue>` — inside the owner's `<PlayerBadge score={…}>` when per-player, in `hud` when shared (pot, round number).
- Score changes always animate (ScoreValue pulses automatically). Never silently swap a number.
- Derived displays (blackjack hand total) are still just given-state renders: compute-for-display is fine, judging ("bust") comes from upstream state.

## Game start

- Opening gets a "moment" (see `animation.md`): deal-in, board fade-in. Once per game, on first render of a fresh game.

## Game end

- Terminal state → `<Modal>`: `title` = outcome ("Checkmate", "Dealer wins"), body = one line of detail, `actions` = replay/next.
- Winner's badge gets `winner`; `active` clears on ALL badges (no one is to-act anymore).
- Draw/timeout/forfeit are titles + body detail, same modal: "Draw — by repetition", "Time out — GPT-5 flag fell".

## Announcements (`<GameAnnouncer>`)

One announcer at layout root. Update its `message` on: move made ("Dealer draws the 7 of clubs"), turn change ("Your turn"), score change, game end. Plain language, present tense, no coordinates-only strings ("Knight to f3", not "Nf3").

## Replay vs live

Same UI both ways — replay is just state over time. When scrubbing (jumping many states at once), suppress per-move animation and announcements; render the target state directly. Single-step forward = animate like live.
