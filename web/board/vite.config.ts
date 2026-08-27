import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// The geometry entry point has no runtime dependencies -- not React, not Pixi,
// not even the DOM. That is deliberate: it is what lets the PixiJS visualizers
// (chess, go) and the Canvas2D ones consume the identical Board object, and
// what lets the tests run in plain Node with no jsdom.
export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@kaggle-environments/board',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist',
  },
});
