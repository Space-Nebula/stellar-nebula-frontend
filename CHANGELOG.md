# Changelog

All notable changes to the Nebula Nomad frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Dedicated performance unit test suites (`test/performance/fps.test.ts`, `test/performance/memory.test.ts`, `test/performance/render.test.ts`) covering 60 FPS benchmarks, Three.js resource leak detection, and WebGL rendering budgets (#336).
- Standalone offline fallback page (`public/offline.html`) and dedicated `/offline` route with cached vessel telemetry, cached asset registry inspection, and interactive network reconnection probing (#324).
- Root compatibility configuration (`lighthouse.config.js` and `lighthouserc.cjs`) and enhanced cross-platform performance CI execution script (#337).

### Changed

- Refactored `.github/workflows/release.yml` to call reusable `.github/workflows/ci.yml` workflow, eliminating duplicated CI steps (#343).
- Configured dedicated performance test project in `vitest.config.ts` and updated release script execution in `package.json` (#336, #343).

### Fixed

- `test/performance/fps.test.ts` had a second test file pasted into it, so the FPS & memory-leak job failed to compile it; the file is restored and the benchmark tests now live in `test/performance/fps-benchmark.test.ts` (#533).
- The production build no longer fails type-checking (`tsc -b`): removed the undefined `initErrorTracking` call and dead locals, typed the SDK 17 Horizon records and `BASE_FEE`, fixed logger call signatures and typed-array crypto types, and rebuilt `useLedger` on `@ledgerhq/hw-app-str` (the `@stellar/ledger-sdk` package it imported does not exist) (#534, #537).
- CI's `build` job pointed at a non-existent `andresz1/size-limit-action@v1.8.1` tag and failed in "Set up job"; it now uses `v1.8.0` (#537).
- Loading skeletons for the Nebula view, marketplace and leaderboard had `aria-label` on a role-less `div` (axe `aria-prohibited-attr`); they now have `role="status"`. `disposeHierarchy` no longer throws on scene-like objects without `children` during effect cleanup (#536).
