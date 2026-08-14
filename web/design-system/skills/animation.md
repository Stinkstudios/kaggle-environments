# Skill: animation

Durations and easings are tokens, chosen by **element size × moment weight**. Never invent a millisecond value or a cubic-bezier.

## Duration table (use `duration-(--dur-*)`)

| What's moving | Var | ≈ |
| --- | --- | --- |
| Hover, tooltip, small UI feedback | `--dur-micro` | 150ms |
| Chip, badge glow, score pulse | `--dur-small` | 200ms |
| A card flipping/moving, a piece sliding | `--dur-medium` | 350ms |
| Board-scale transition, modal | `--dur-large` | 500ms |
| Theatrical moment (see below) | `--dur-moment` | 900ms |

Bigger thing = longer. A tooltip at 500ms feels broken; a full-board reveal at 150ms feels cheap.

Example: `transition-transform duration-(--dur-medium) ease-move`.

## Easing utilities

| Motion | Utility |
| --- | --- |
| Element appearing | `ease-enter` |
| Element leaving | `ease-exit` |
| Traveling across screen | `ease-move` |
| Playful land/pop (stone place, modal) | `ease-spring` |

## Moments — earn them

`--dur-moment` is reserved for events the viewer should *feel*: game start (opening deal, board reveal), game end (result modal sequence), rare big events (checkmate, blackjack). Everything else is routine speed. More than ~3 moment-scale animations per game = it's noise, cut back.

## Built-in (don't re-add)

Components already animate: card flip (`faceDown` prop), stone placement pop (`animate-stone-place`), score pulse, badge active-glow, modal/popover entry, turn-dot blink. Adding motion on top of these = double animation, remove yours.

## Signature effects (particles, trails, captures)

- **Never inferred.** Only build these when the game brief explicitly describes them ("captures poof into smoke").
- Character descriptions are animation direction — "the rook charges in and destroys" ⇒ fast linear travel + impact shake. Use the brief's language.
- Particles/trails = PixiJS layer over the DOM board. That is the ONLY reason to add canvas. One `<canvas>` overlay, pointer-events none.
- For the PixiJS API itself, use PixiJS's own LLM docs — https://pixijs.com/llms (llms.txt + per-topic guides; packaged PixiJS agent skills exist for Claude). This skill owns only the boundary rules above; don't restate Pixi's API here.

## Reduced motion

The `--dur-*` vars collapse to ~0ms under `prefers-reduced-motion` automatically; gate keyframed animations with `motion-safe:` (e.g. `motion-safe:animate-stone-place`). Rules for anything you add: state change stays visible (opacity/color swap OK), nothing loops, no parallax. Pixi effects: skip entirely, show the end state.

## Scrubbing

When a replay scrubber jumps multiple states, render the target state without animation. Animate only single-step transitions. (See `visualizer-behavior.md`.)
