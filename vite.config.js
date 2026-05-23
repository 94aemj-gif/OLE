import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'src',
  publicDir: resolve(import.meta.dirname, 'src/public'),
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'src/pages/index.html'),
        dashboard: resolve(import.meta.dirname, 'src/pages/dashboard.html'),
        admin: resolve(import.meta.dirname, 'src/pages/admin.html'),
        graficas: resolve(import.meta.dirname, 'src/pages/graficas.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src')
    }
  },
  server: {
    port: 5173,
    open: '/pages/index.html'
  }
});
