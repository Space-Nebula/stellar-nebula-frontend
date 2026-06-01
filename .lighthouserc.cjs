module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--headless --no-sandbox --disable-gpu --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.75 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'optimistic' }],
        'total-blocking-time': ['error', { maxNumericValue: 300, aggregationMethod: 'optimistic' }],
        'resource-summary:script:size': ['warn', { maxNumericValue: 1600000, aggregationMethod: 'optimistic' }],
        'resource-summary:image:size': ['warn', { maxNumericValue: 900000, aggregationMethod: 'optimistic' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
}
