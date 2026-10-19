# Performance Budgets

This document describes the performance budgets that are enforced in CI (#384) and
explains how to update them, how to read the reports CI posts on pull requests, and
where to find the raw configuration.

## Why budgets?

Without automated enforcement a bundle that silently crosses a size or Web Vital
threshold can ship without anyone noticing. Budgets make regressions visible at review
time — the CI job fails before merge, and a comment on the PR shows the before/after
numbers so reviewers can decide whether the increase is justified.

## Bundle size budgets (`.size-limit.json`)

[size-limit](https://github.com/ai/size-limit) reads `.size-limit.json` after a
production build and fails the job when any entry exceeds its limit. Limits are
measured as the gzip-compressed size of the matched files.

| Entry                   | Limit   |
| ----------------------- | ------- |
| Total JS (gzip)         | 1030 kB |
| Vendor chunk (gzip)     | 450 kB  |
| React vendor (gzip)     | 95 kB   |
| Three.js feature (gzip) | 275 kB  |
| Stellar feature (gzip)  | 315 kB  |
| CSS bundle (gzip)       | 40 kB   |
| HTML entry              | 5 kB    |
| Total dist size         | 1.2 MB  |

CI enforcement: the **Bundle size budgets** job in
`.github/workflows/performance.yml` runs `size-limit` and posts a before/after comment
on every pull request via `andresz1/size-limit-action`.

To update a limit, edit the relevant entry in `.size-limit.json`. Always tighten rather
than loosen without a justified reason, and document the reason in the PR description.

## Lighthouse / Core Web Vital budgets (`.lighthouserc.cjs`)

[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) builds the app, serves
it locally, runs 3 Lighthouse audits and asserts each metric against the thresholds in
`.lighthouserc.cjs`. The `aggregationMethod: "optimistic"` strategy picks the best
run across the 3 audits to avoid failing on transient CI noise, while sustained
regressions will still trip the budget.

| Metric                    | Budget    | Error level |
| ------------------------- | --------- | ----------- |
| Performance score         | ≥ 0.80    | error       |
| First Contentful Paint    | ≤ 1800 ms | error       |
| Largest Contentful Paint  | ≤ 2500 ms | error       |
| Time To Interactive       | ≤ 4000 ms | error       |
| Total Blocking Time       | ≤ 250 ms  | error       |
| Cumulative Layout Shift   | ≤ 0.1     | error       |
| Speed Index               | ≤ 3000 ms | warn        |
| Script size               | ≤ 2 MB    | error       |
| Image size                | ≤ 700 kB  | warn        |
| Font size                 | ≤ 200 kB  | warn        |
| Total resource size       | ≤ 3 MB    | warn        |
| Render-blocking resources | 0         | warn        |
| Total request count       | ≤ 60      | warn        |

CI enforcement: the **Lighthouse CI budget checks** job in
`.github/workflows/performance.yml` runs `npm run performance:ci` (which runs the full
Lighthouse CI suite) and posts a per-metric summary table as a PR comment. The job
fails when any `"error"`-level threshold is exceeded.

### Tightening schedule

After the first 4-week baseline period (track results in `.lighthouseci/` artifact
history), tighten thresholds to:

- Performance score → 0.85
- FCP → 1800 ms
- LCP → 2000 ms
- TTI → 3500 ms
- TBT → 150 ms
- CLS → 0.05

## Running budgets locally

```sh
# Bundle size
npm run build && npm run size-limit

# Lighthouse (requires a production build and a Chrome binary)
npm run performance:ci
```

## Adding a new budget

1. **Bundle size**: add an entry to `.size-limit.json`.
2. **Lighthouse**: add an assertion to the `assert.assertions` block in
   `.lighthouserc.cjs`. Use `"error"` for hard limits (blocks merge) and `"warn"` for
   soft limits (alerts but does not fail).
3. Update this document's tables.
