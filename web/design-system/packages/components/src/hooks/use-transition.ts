import type { Transition } from 'motion/react';

const instant: Transition = { duration: 0 };

/**
 * Returns `{ duration: 0 }` when `reducedMotion` is on, otherwise the given
 * transition unchanged. Takes `reducedMotion` as a plain argument rather than
 * reading it off a hardcoded preferences store, so callers stay in charge of
 * where that flag comes from (their own `usePreferences`, a context, etc.).
 */
export function useTransition(transition: Transition, reducedMotion: boolean): Transition {
  return reducedMotion ? instant : transition;
}
