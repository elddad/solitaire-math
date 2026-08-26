import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base + docs/ output so GitHub Pages can serve the build straight
// from the main branch (Settings -> Pages -> /docs) with no workflow.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'docs', emptyOutDir: true },
  server: { port: 5173, host: true },
});
