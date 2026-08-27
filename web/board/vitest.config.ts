import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so the dts plugin (which only matters for the
// library build) does not run during tests. The geometry has no DOM dependency,
// so the default node environment is deliberate -- if a test ever needs jsdom,
// something has leaked into the wrong entry point.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
