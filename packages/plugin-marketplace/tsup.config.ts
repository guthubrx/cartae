import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // Skip DTS generation - use tsc directly for type checking
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  // External dependencies (ne pas bundler les packages @cartae/*)
  external: ['@cartae/ui', '@cartae/core', '@cartae/plugin-sdk', 'react', 'react-dom'],
});
