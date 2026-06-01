import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const r = (p) => resolve(import.meta.dirname, p);

const realPages = {
  index: r('src/pages/index.html'),
  dashboard: r('src/pages/dashboard.html'),
  admin: r('src/pages/admin.html'),
  graficas: r('src/pages/graficas.html'),
  historial: r('src/pages/historial.html')
};

const mockupPages = {
  mockups: r('src/pages/mockups.html'),
  mockup1: r('src/pages/mockup-1.html'),
  mockup2: r('src/pages/mockup-2.html'),
  mockup3: r('src/pages/mockup-3.html'),
  mockup4: r('src/pages/mockup-4.html'),
  mockup5: r('src/pages/mockup-5.html'),
  mockup2Tablero: r('src/pages/mockup-2-tablero.html'),
  mockup2Admin: r('src/pages/mockup-2-admin.html'),
  mockup2Graficas: r('src/pages/mockup-2-graficas.html'),
  mockup2Capture: r('src/pages/mockup-2-capture.html'),
  headerMockups: r('src/pages/header-mockups.html'),
  mobileMockups: r('src/pages/mobile-mockups.html'),
  mobileOperator: r('src/pages/mobile-operator.html'),
  mobileTablero: r('src/pages/mobile-tablero.html'),
  mobileGraficas: r('src/pages/mobile-graficas.html'),
  mobileAdmin: r('src/pages/mobile-admin.html'),
  mobileCapture: r('src/pages/mobile-capture.html'),
  navMockups: r('src/pages/nav-mockups.html'),
  navMockup1: r('src/pages/nav-mockup-1.html'),
  navMockup2: r('src/pages/nav-mockup-2.html'),
  navMockup3: r('src/pages/nav-mockup-3.html'),
  navMockup4: r('src/pages/nav-mockup-4.html'),
  navMockup5: r('src/pages/nav-mockup-5.html'),
  kpiMockups: r('src/pages/kpi-mockups.html'),
  kpiMockup1: r('src/pages/kpi-mockup-1.html'),
  kpiMockup2: r('src/pages/kpi-mockup-2.html'),
  kpiMockup3: r('src/pages/kpi-mockup-3.html'),
  kpiMockup4: r('src/pages/kpi-mockup-4.html'),
  kpiMockup5: r('src/pages/kpi-mockup-5.html')
};

const includeMockups = process.env.MOCKUPS === '1';

export default defineConfig({
  root: 'src',
  publicDir: resolve(import.meta.dirname, 'src/public'),
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: includeMockups ? { ...realPages, ...mockupPages } : realPages
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
