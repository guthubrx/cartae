/* eslint-disable */
/**
 * FR: Configuration Vite pour l'application web BigMind
 * EN: Vite configuration for BigMind web application
 *
 * OPTIMISATIONS PERFORMANCE:
 * - Code splitting agressif par vendor et feature
 * - Compression Gzip + Brotli
 * - Bundle analyzer (ANALYZE=true)
 * - Cache-friendly filenames avec hash
 * - Minification Terser optimale
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // FR: Support des paths TypeScript / EN: TypeScript paths support

    // FR: Bundle analyzer (développement seulement)
    // EN: Bundle analyzer (development only)
    process.env.ANALYZE === 'true' && visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // ou 'sunburst', 'network'
    }),

    // FR: Compression Gzip
    // EN: Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 10KB minimum
      deleteOriginFile: false,
    }),

    // FR: Compression Brotli (meilleure que Gzip)
    // EN: Brotli compression (better than Gzip)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@cartae/mindmap-core': path.resolve(__dirname, '../../packages/mindmap-core/src'),
      '@cartae/design': path.resolve(__dirname, '../../packages/design/src'),
      '@cartae/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@cartae/plugin-system': path.resolve(__dirname, '../../packages/plugin-system/src'),
      '@cartae/plugin-marketplace': path.resolve(__dirname, '../../packages/plugin-marketplace/src'),
      '@cartae/core': path.resolve(__dirname, '../../packages/core/src'),
    },
  },

  server: {
    port: 5173,
    open: false,
    hmr: {
      overlay: false,
    },
  },

  logLevel: 'warn',

  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug'] : [],
      },
    },

    rollupOptions: {
      output: {
        // FR: Code splitting manuel par vendor et feature
        // EN: Manual code splitting by vendor and feature
        manualChunks: (id) => {
          // Vendors principaux (séparés pour cache optimal)
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@xyflow/react')) {
              return 'vendor-reactflow';
            }
            if (id.includes('zustand')) {
              return 'vendor-zustand';
            }
            if (id.includes('dockview')) {
              return 'vendor-dockview';
            }
            if (id.includes('blocknote')) {
              return 'vendor-blocknote';
            }
            if (id.includes('bytemd') || id.includes('highlight.js')) {
              return 'vendor-markdown';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            if (id.includes('dexie')) {
              return 'vendor-db';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Autres vendors dans chunk générique
            return 'vendor-misc';
          }

          // Code application par feature (lazy loading friendly)
          if (id.includes('/pages/')) {
            if (id.includes('/pages/admin/')) {
              return 'pages-admin';
            }
            if (id.includes('/pages/settings/')) {
              return 'pages-settings';
            }
            if (id.includes('/pages/marketplace/')) {
              return 'pages-marketplace';
            }
            return 'pages-main';
          }

          if (id.includes('/plugins/')) {
            return 'feature-plugins';
          }

          if (id.includes('/components/vault/')) {
            return 'feature-vault';
          }

          if (id.includes('/components/')) {
            return 'components-shared';
          }
        },

        // FR: Nommage fichiers optimisé pour cache (hash stable)
        // EN: Cache-optimized file naming (stable hash)
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          return `chunks/${name}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) {
            return 'css/[name]-[hash][extname]';
          }
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(name)) {
            return 'img/[name]-[hash][extname]';
          }
          if (/\.(woff2?|ttf|eot)$/.test(name)) {
            return 'fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },

    // FR: Target navigateurs modernes (bundle plus petit)
    // EN: Target modern browsers (smaller bundle)
    target: 'es2020',

    // FR: CSS code splitting activé
    // EN: CSS code splitting enabled
    cssCodeSplit: true,

    // FR: Chunk size warnings (ajustables selon besoins)
    // EN: Chunk size warnings (adjustable as needed)
    chunkSizeWarningLimit: 1000, // 1MB
  },

  optimizeDeps: {
    include: ['react', 'react-dom', '@xyflow/react', 'zustand'],
    exclude: [], // Exclure libs problématiques si nécessaire
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
});
