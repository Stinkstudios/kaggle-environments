import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// PixiJS is a peer dependency, not a bundled one. A visualizer that already
// draws with Pixi must end up with exactly one copy of it -- two would mean two
// WebGL renderers, two texture caches, and `instanceof Sprite` checks that
// silently fail across the boundary.
export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@kaggle-environments/design-system-board-renderer',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['pixi.js', '@kaggle-environments/board', '@kaggle-environments/design-system-assets'],
    },
  },
});
