import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.spec.js'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/modules/**/*.js'],
      exclude: ['src/modules/charts/**', 'src/modules/i18n/**/*.json'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
        'src/modules/sync/**': { lines: 90, functions: 90, statements: 90, branches: 85 },
        'src/modules/kpi/**': { lines: 90, functions: 90, statements: 90, branches: 85 },
        'src/modules/audit/**': { lines: 90, functions: 90, statements: 90, branches: 85 },
        'src/modules/auth/**': { lines: 85, functions: 85, statements: 85, branches: 80 }
      }
    },
    setupFiles: ['./tests/setup.js']
  }
});
