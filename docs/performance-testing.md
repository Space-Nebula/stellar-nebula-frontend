# Frontend Performance Testing

Nebula Nomad includes automated performance validation for render smoothness, initial load, and memory stability.

## Targets

- 60 FPS rendering target for the nebula render loop
- Largest Contentful Paint (LCP) under 2.5s
- Total Blocking Time (TBT) under 300ms
- JavaScript bundle budget capped at 1.6 MB
- Image/asset budget capped at 900 KB

## Local commands

- `npm run performance:test` runs the FPS and memory leak regression tests.
- `npm run performance:lighthouse` runs Lighthouse CI against the production build preview.
- `npm run performance:ci` builds the app, serves it locally, and runs Lighthouse CI.

## Reports

Lighthouse CI outputs generated reports to `.lighthouseci/` when `npm run performance:ci` is executed. CI uploads the same directory as an artifact.

## Interpretation

- The FPS benchmark utility reports render smoothness and flags samples below the configured target.
- The memory tracker verifies cleanup of geometries, textures, materials, animation frames, and event listeners.
- Lighthouse failures indicate either budget regressions or a runtime performance problem on the built page.
