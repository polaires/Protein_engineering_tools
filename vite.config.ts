import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
  },

  // Environment prefix for Tauri
  envPrefix: ['VITE_', 'TAURI_'],

  // Build configuration
  build: {
    // Target modern browsers that support BigInt (required by RDKit.js WASM)
    // Safari 14+ supports BigInt
    target: ['es2020', 'chrome87', 'firefox78', 'safari14', 'edge88'],
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    // Optimize chunk sizes for Mol* and RDKit
    chunkSizeWarningLimit: 5000,
  },

  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['molstar'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
});
