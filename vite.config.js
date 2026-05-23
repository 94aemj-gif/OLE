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
        graficas: resolve(import.meta.dirname, 'src/pages/graficas.html'),
        mockups: resolve(import.meta.dirname, 'src/pages/mockups.html'),
        mockup1: resolve(import.meta.dirname, 'src/pages/mockup-1.html'),
        mockup2: resolve(import.meta.dirname, 'src/pages/mockup-2.html'),
        mockup3: resolve(import.meta.dirname, 'src/pages/mockup-3.html'),
        mockup4: resolve(import.meta.dirname, 'src/pages/mockup-4.html'),
        mockup5: resolve(import.meta.dirname, 'src/pages/mockup-5.html'),
        mockup2Tablero: resolve(import.meta.dirname, 'src/pages/mockup-2-tablero.html'),
        mockup2Admin: resolve(import.meta.dirname, 'src/pages/mockup-2-admin.html'),
        mockup2Graficas: resolve(import.meta.dirname, 'src/pages/mockup-2-graficas.html'),
        mockup2Capture: resolve(import.meta.dirname, 'src/pages/mockup-2-capture.html')
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
