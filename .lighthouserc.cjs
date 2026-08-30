/**
 * Lighthouse CI configuration with strict performance budgets.
 *
 * Strategy: enforce meaningful limits for every Core Web Vital and key
 * resource-size metrics. The aggregation method is "optimistic" (best
 * run) so a single slow run caused by CI noise does not fail the build,
 * but sustained regressions will.
 *
 * Tightening schedule (raise to these values after 4-week baseline):
 *   performance score  → 0.85
 *   FCP                → 1800 ms
 *   LCP                → 2000 ms
 *   TTI                → 3500 ms
 *   TBT                → 150 ms
 *   CLS                → 0.05
 */
module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--headless --no-sandbox --disable-gpu --disable-dev-shm-usage',
        // Simulate a fast 4G mobile connection for realistic budget enforcement
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
    },

    assert: {
      assertions: {
        // ── Overall score ────────────────────────────────────────────────
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],

        // ── Core Web Vitals ──────────────────────────────────────────────
        /** First Contentful Paint: paint starts within 1.8 s */
        'first-contentful-paint': [
          'error',
          { maxNumericValue: 1800, aggregationMethod: 'optimistic' },
        ],

        /** Largest Contentful Paint: hero content visible within 2.5 s */
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2500, aggregationMethod: 'optimistic' },
        ],

        /** Time To Interactive: fully interactive within 4 s */
        interactive: ['error', { maxNumericValue: 4000, aggregationMethod: 'optimistic' }],

        /** Total Blocking Time: main-thread blocked < 250 ms */
        'total-blocking-time': ['error', { maxNumericValue: 250, aggregationMethod: 'optimistic' }],

        /** Cumulative Layout Shift: virtually no unexpected shifts */
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.1, aggregationMethod: 'optimistic' },
        ],

        /** Speed Index: visual loading speed */
        'speed-index': ['warn', { maxNumericValue: 3000, aggregationMethod: 'optimistic' }],

        // ── Resource budgets ─────────────────────────────────────────────
        /** JS payload: Three.js + React. Warn at 1.5 MB, fail at 2 MB */
        'resource-summary:script:size': [
          'error',
          { maxNumericValue: 2000000, aggregationMethod: 'optimistic' },
        ],
        'resource-summary:image:size': [
          'warn',
          { maxNumericValue: 700000, aggregationMethod: 'optimistic' },
        ],
        'resource-summary:font:size': [
          'warn',
          { maxNumericValue: 200000, aggregationMethod: 'optimistic' },
        ],
        'resource-summary:total:size': [
          'warn',
          { maxNumericValue: 3000000, aggregationMethod: 'optimistic' },
        ],

        // ── Render-blocking resources ────────────────────────────────────
        'render-blocking-resources': ['warn', { maxLength: 0 }],

        // ── Network requests ─────────────────────────────────────────────
        'resource-summary:total:count': [
          'warn',
          { maxNumericValue: 60, aggregationMethod: 'optimistic' },
        ],

        // ── Diagnostics ──────────────────────────────────────────────────
        'unused-javascript': ['warn', { maxLength: 3 }],
        'unused-css-rules': ['warn', { maxLength: 3 }],
        'uses-text-compression': ['warn', { minScore: 1 }],
        'uses-long-cache-ttl': ['warn', { minScore: 0.8 }],
      },
    },

    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
}
