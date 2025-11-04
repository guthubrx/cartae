import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@office365-connector': path.resolve(__dirname, '../../cartae-private/plugins/office365-connector/src'),
    },
  },
  server: {
    port: 5174,
    open: false,
    hmr: {
      overlay: false,
    },
  },
  logLevel: 'warn',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
