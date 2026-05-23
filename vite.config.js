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
        mockup2Capture: resolve(import.meta.dirname, 'src/pages/mockup-2-capture.html'),
        headerMockups: resolve(import.meta.dirname, 'src/pages/header-mockups.html'),
        mobileMockups: resolve(import.meta.dirname, 'src/pages/mobile-mockups.html'),
        mobileOperator: resolve(import.meta.dirname, 'src/pages/mobile-operator.html'),
        mobileTablero: resolve(import.meta.dirname, 'src/pages/mobile-tablero.html'),
        mobileGraficas: resolve(import.meta.dirname, 'src/pages/mobile-graficas.html'),
        mobileAdmin: resolve(import.meta.dirname, 'src/pages/mobile-admin.html'),
        mobileCapture: resolve(import.meta.dirname, 'src/pages/mobile-capture.html'),
        navMockups: resolve(import.meta.dirname, 'src/pages/nav-mockups.html'),
        navMockup1: resolve(import.meta.dirname, 'src/pages/nav-mockup-1.html'),
        navMockup2: resolve(import.meta.dirname, 'src/pages/nav-mockup-2.html'),
        navMockup3: resolve(import.meta.dirname, 'src/pages/nav-mockup-3.html'),
        navMockup4: resolve(import.meta.dirname, 'src/pages/nav-mockup-4.html'),
        navMockup5: resolve(import.meta.dirname, 'src/pages/nav-mockup-5.html')
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
