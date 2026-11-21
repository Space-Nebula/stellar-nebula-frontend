# Performance Benchmarks

What we measure, the latest results, how they changed over time, and where the full history lives.

| Benchmark              | Tool                                                  | Budget enforced by                                                                                                                   | Recorded over time by |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Bundle size            | `scripts/bundle-analysis.mjs`                         | `ci.yml` (fails on more than 10% gzip growth per chunk or in total, against `.bundle-baseline.json`; `size-limit` per-chunk budgets) | `benchmark.yml`       |
| Page load (Lighthouse) | `scripts/performance-ci.mjs` with `.lighthouserc.cjs` | `performance.yml`                                                                                                                    | `benchmark.yml`       |
| Frame rate and memory  | `npm run performance:test` (`test/performance/`)      | `performance.yml`                                                                                                                    | pass/fail only        |

## Latest results

Measured on 2026-11-21 at commit `1ef8f53` (Node 22.20.0, Windows 11), with `SKIP_SRI_CHECK=1 npx vite build` followed by `node scripts/bundle-analysis.mjs`. Bundle sizes depend only on the commit, not on the machine. KB means 1,024 bytes.

### Bundle size

| Measure           |       Size |
| ----------------- | ---------: |
| Total JS (gzip)   | 1,101.9 KB |
| Total JS (brotli) |   921.6 KB |
| CSS (gzip)        |     8.9 KB |

By chunk category (gzip):

| Category          | Contents                                                                                     |     Size |
| ----------------- | -------------------------------------------------------------------------------------------- | -------: |
| `vendor`          | Other libraries, including the wallet (`vendor-wallets`) and Sentry (`vendor-sentry`) chunks | 439.3 KB |
| `feature-three`   | Three.js, React Three Fiber, postprocessing                                                  | 277.3 KB |
| `feature-stellar` | Stellar SDK and Albedo                                                                       | 180.0 KB |
| `other`           | App routes and components, service worker                                                    |  96.3 KB |
| `react-vendor`    | React, React DOM, React Router                                                               |  73.2 KB |
| `main`            | App entry (`index`)                                                                          |  20.9 KB |

Against the committed baseline, four chunks are over the 10% per-chunk budget: `react-vendor` (+13.2%), `ShipDashboard` (+29.0%), `env` (+21.3%) and `WalletDisplay` (+27.4%).

### Frame rate and memory

`npm run performance:test` checks the thresholds in `test/performance/thresholds.ts`:

| Threshold                        |    Value |
| -------------------------------- | -------: |
| Minimum sustained frame rate     |   45 FPS |
| Target frame rate                |   60 FPS |
| Maximum memory                   |   200 MB |
| Maximum initial load/render time | 3,000 ms |

At `1ef8f53`, 5 of the 6 test files pass (42 tests across the `unit` and `performance` Vitest projects). `test/performance/fps.test.ts` does not compile (syntax error at line 54).

### Page load (Lighthouse)

Lighthouse runs three times against the production build (desktop, simulated fast connection) and keeps the median run. The budgets come from `.lighthouserc.cjs`:

| Metric                     |     Budget |
| -------------------------- | ---------: |
| Performance score          |       ≥ 90 |
| First Contentful Paint     | ≤ 1,800 ms |
| Largest Contentful Paint   | ≤ 2,500 ms |
| Time to Interactive        | ≤ 3,800 ms |
| Total Blocking Time        |   ≤ 250 ms |
| Cumulative Layout Shift    |      ≤ 0.1 |
| Speed Index (warning only) | ≤ 3,000 ms |

No Lighthouse result exists for `1ef8f53`: that build stops with a runtime error before its first paint, so Lighthouse reports `NO_FCP`. The workflow records Lighthouse figures from the first commit that renders.

## History

| Date       | Commit                              |    Total JS (gzip) | Total JS (brotli) |     CSS (gzip) |  `feature-three` |   `react-vendor` |          `other` |
| ---------- | ----------------------------------- | -----------------: | ----------------: | -------------: | ---------------: | ---------------: | ---------------: |
| 2026-10-18 | `a49d92b` (`.bundle-baseline.json`) |         1,043.3 KB |          871.1 KB |         8.8 KB |         255.5 KB |          64.7 KB |          83.0 KB |
| 2026-11-21 | `1ef8f53`                           | 1,101.9 KB (+5.6%) |  921.6 KB (+5.8%) | 8.9 KB (+0.8%) | 277.3 KB (+8.5%) | 73.2 KB (+13.2%) | 96.3 KB (+16.0%) |

### Automated tracking

`.github/workflows/benchmark.yml` runs on every push to `main` (and on demand from the Actions tab):

1. Builds the app and measures bundle sizes and Lighthouse results.
2. Writes a results table to the run's **job summary**.
3. Appends the results to `dev/bench/data.js` on the `gh-pages` branch with [github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark). That file is the full history: one entry per commit.
4. Comments on the commit when a metric gets 50% worse than the previous run.

The same history is drawn as charts at `https://space-nebula.github.io/stellar-nebula-frontend/dev/bench/` once GitHub Pages serves the `gh-pages` branch (**Settings → Pages → Deploy from a branch → `gh-pages`**). The PR previews already published to `gh-pages` are kept.

The workflow only records numbers. It skips the type check and the CDN integrity check (`ci.yml` enforces both), so a failing build or budget still produces a data point.

## Running the benchmarks locally

```bash
npm run build                     # or: SKIP_SRI_CHECK=1 npx vite build when offline
node scripts/bundle-analysis.mjs  # bundle sizes vs .bundle-baseline.json
node scripts/performance-ci.mjs   # Lighthouse, 3 runs, reports in .lighthouseci/
npm run performance:test          # frame rate and memory thresholds
```

See [PERFORMANCE_BUDGETS.md](PERFORMANCE_BUDGETS.md) for how budgets are chosen and [performance-testing.md](performance-testing.md) for reading Lighthouse reports.
