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
    // `build` is `tsc -b && vite build`, and tsc emits the per-family modules
    // (dist/generated/*.js) that this package's "./*" subpath export points at.
    // Vite empties outDir by default, which deleted them and left every
    // `.../design-system-assets/go` import unresolvable in a consumer's
    // production build -- while dev kept working, because that resolves through
    // the "development" condition to src/. Keep tsc's output.
    emptyOutDir: false,
    // Assets are emitted by scripts/build-assets.mjs, then referenced from
    // generated/registry.ts as real imports so Vite fingerprints and copies
    // them into each consumer's own bundle.
    assetsInlineLimit: 0,
  },
});
