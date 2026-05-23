module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm preview',
      url: [
        'http://localhost:4173/pages/index.html',
        'http://localhost:4173/pages/dashboard.html'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttlingMethod: 'simulate'
      }
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }]
      }
    },
    upload: { target: 'temporary-public-storage' }
  }
};
