import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), dts({ exclude: ['src/dev/**'] })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@kaggle-environments/design-system',
      fileName: 'index',
    },
    outDir: 'dist',
    rollupOptions: {
      // Only externalize React - it must be a singleton across the app.
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
  },
  server: {
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 5174,
  },
});
