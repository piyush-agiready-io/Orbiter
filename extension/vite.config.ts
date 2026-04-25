import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

// Content script must be built as IIFE (no ES module imports allowed)
// Popup and service worker are built together as ES modules
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'icons/*', dest: '.' },
      ],
    }),
  ],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/index.html'),
        'service-worker': resolve(__dirname, 'background/service-worker.ts'),
        'content-script': resolve(__dirname, 'content/content-script.ts'),
        'platform-auth-bridge': resolve(__dirname, 'platform-auth-bridge.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@ext': resolve(__dirname, '.'),
    },
  },
});
