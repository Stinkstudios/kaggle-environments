/**
 * Anything an animation library hands back that can be cancelled.
 *
 * `motion` (chess) returns `{ stop() }`; `gsap` (go) returns `{ kill() }`. This
 * package takes no position on which you use -- it only needs to be able to
 * cancel, so it accepts either shape rather than dragging a second animation
 * library into every visualizer that adopts it.
 */
export interface Stoppable {
  stop?: () => void;
  kill?: () => void;
}

export interface AnimationSet {
  /** Track an animation. Returns it, so it composes inline. */
  add<T extends Stoppable>(animation: T): T;
  /** Cancel and forget everything tracked. */
  stopAll(): void;
  readonly size: number;
}

/**
 * In-flight animations, cancelled as a group.
 *
 * Both existing Pixi visualizers keep exactly this set and clear it at the top
 * of every update, because a replay is scrubbable: the user can jump from step
 * 40 to step 3 while a capture is still animating, and an un-cancelled tween
 * keeps writing to a sprite that no longer belongs to the scene. `chess` hit
 * that as motion writing to `Point`s on destroyed sprites.
 *
 * Keep looping animations in their own set. `go` does -- its atari wobble
 * repeats forever, so clearing it on every update would restart the loop and
 * make it stutter, while the one-shot drops and captures genuinely must go.
 *
 * ```ts
 * const moves = createAnimationSet();
 * const wobbles = createAnimationSet();
 *
 * function update() {
 *   moves.stopAll();
 *   moves.add(animate(sprite.position, target, spring));
 * }
 * ```
 */
export function createAnimationSet(): AnimationSet {
  const animations = new Set<Stoppable>();

  return {
    add(animation) {
      animations.add(animation);
      return animation;
    },
    stopAll() {
      for (const animation of animations) {
        // gsap spells it `kill`, motion spells it `stop`. Try both rather than
        // making the caller adapt -- a missed cancel is a bug that only shows
        // up while scrubbing, which is exactly where it is hardest to notice.
        animation.stop?.();
        animation.kill?.();
      }
      animations.clear();
    },
    get size() {
      return animations.size;
    },
  };
}
