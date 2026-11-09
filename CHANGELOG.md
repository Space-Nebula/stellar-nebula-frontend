# Changelog

All notable changes to the Nebula Nomad frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Dedicated performance unit test suites (`test/performance/fps.test.ts`, `test/performance/memory.test.ts`, `test/performance/render.test.ts`) covering 60 FPS benchmarks, Three.js resource leak detection, and WebGL rendering budgets (#336).
- Standalone offline fallback page (`public/offline.html`) and dedicated `/offline` route with cached vessel telemetry, cached asset registry inspection, and interactive network reconnection probing (#324).
- Root compatibility configuration (`lighthouse.config.js` and `lighthouserc.cjs`) and enhanced cross-platform performance CI execution script (#337).
- Added comprehensive [Migration Guides](docs/MIGRATIONS.md), [Breaking Changes Log](docs/BREAKING_CHANGES.md), and [Version Upgrade Guide](docs/UPGRADE_GUIDE.md) covering React 19, Stellar SDK v13, and Freighter wallet integration (#506).

### Changed

- Refactored `.github/workflows/release.yml` to call reusable `.github/workflows/ci.yml` workflow, eliminating duplicated CI steps (#343).
- Configured dedicated performance test project in `vitest.config.ts` and updated release script execution in `package.json` (#336, #343).
