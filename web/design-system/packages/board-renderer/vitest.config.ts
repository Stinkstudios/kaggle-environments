import { defineConfig } from 'vitest/config';

// Node environment, no jsdom and no WebGL. Everything under test here is the
// *derivation* -- collinear stroke merging, label placement, sprite
// reconciliation, animation bookkeeping -- which is deliberately separated from
// the Pixi objects it feeds so it can be asserted without a GPU. The drawing
// itself is proven in Storybook, where a real renderer can be looked at.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
