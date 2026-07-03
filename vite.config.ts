import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['localhost', 'c388-136-62-118-167.ngrok-free.app'],
  },
  plugins: [
    react(),
    ViteImageOptimizer({
      png: {
        quality: 70,
        palette: true,
      },
      webp: {
        quality: 80,
        alphaQuality: 80,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
