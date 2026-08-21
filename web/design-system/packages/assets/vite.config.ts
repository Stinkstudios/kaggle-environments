import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@kaggle-environments/design-system-assets',
      fileName: 'index',
    },
    outDir: 'dist',
    // Assets are emitted by scripts/build-assets.mjs, then referenced from
    // generated/registry.ts as real imports so Vite fingerprints and copies
    // them into each consumer's own bundle.
    assetsInlineLimit: 0,
  },
});
