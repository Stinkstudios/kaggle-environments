import { describe, expect, it, vi } from 'vitest';
import { createAnimationSet } from './animations';

describe('createAnimationSet', () => {
  it("cancels motion's `stop` and gsap's `kill` alike", () => {
    const set = createAnimationSet();
    const motionLike = { stop: vi.fn() };
    const gsapLike = { kill: vi.fn() };

    set.add(motionLike);
    set.add(gsapLike);
    set.stopAll();

    expect(motionLike.stop).toHaveBeenCalledOnce();
    expect(gsapLike.kill).toHaveBeenCalledOnce();
  });

  it('returns the animation so it composes inline', () => {
    const set = createAnimationSet();
    const animation = { stop: vi.fn() };

    expect(set.add(animation)).toBe(animation);
  });

  it('forgets what it cancelled, so a second stop is a no-op', () => {
    const set = createAnimationSet();
    const animation = { stop: vi.fn() };

    set.add(animation);
    set.stopAll();
    set.stopAll();

    expect(set.size).toBe(0);
    expect(animation.stop).toHaveBeenCalledOnce();
  });

  it('tolerates a handle that implements neither', () => {
    const set = createAnimationSet();

    set.add({});

    expect(() => set.stopAll()).not.toThrow();
  });

  it('keeps sets independent, so a looping animation survives an update', () => {
    // go's atari wobble repeats forever; clearing it alongside the one-shot
    // drops and captures would restart the loop on every step and make it
    // stutter. Two sets is the answer, so they must not share state.
    const oneShots = createAnimationSet();
    const loops = createAnimationSet();
    const wobble = { kill: vi.fn() };

    loops.add(wobble);
    oneShots.add({ stop: vi.fn() });
    oneShots.stopAll();

    expect(wobble.kill).not.toHaveBeenCalled();
    expect(loops.size).toBe(1);
  });
});
