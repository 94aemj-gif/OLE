import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.vite/**',
      'playwright-report/**',
      'test-results/**',
      '**/*.json'
    ]
  },
  {
    files: ['src/**/*.js', 'api/**/*.js', 'tests/**/*.js', 'vite.config.js', 'vitest.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022
      }
    },
    rules: {
      complexity: ['error', 10],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    files: ['src/modules/i18n/**/*.js', 'src/modules/i18n/**/*.json'],
    rules: {}
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      'no-console': 'off',
      complexity: 'off'
    }
  }
];
