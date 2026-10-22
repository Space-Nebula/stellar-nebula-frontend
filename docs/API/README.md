# API Documentation

Navigable, source-of-truth reference for the project's custom hooks, components, and
utility functions. Each page documents every public export in its area: signature,
parameters/props, return value, and a usage example.

- **[Hooks](./hooks.md)** — all custom React hooks (`src/hooks/**`, plus the handful of
  component-local hooks that live beside the component they serve).
- **[Components](./components.md)** — the component library (`src/components/**`), one
  section per folder, with props tables for every exported component.
- **[Utilities](./utils.md)** — plain-TypeScript helpers (`src/utils/**`), grouped by
  concern (security, caching, Stellar, accessibility, performance, media, Three.js,
  procedural generation, validation).

## Related docs

A few areas already had deep, narrative documentation before this index existed; rather
than duplicate it, the pages above link out to it where it's the better read:

- [`docs/API_REFERENCE.md`](../API_REFERENCE.md) — full lifecycle write-ups for the wallet,
  signing, and contract-call hooks, plus the service layer (contract client, wallet
  services, Stellar utilities, analytics/logging/monitoring, WebSocket, storage/cache).
- [`docs/COMPONENTS.md`](../COMPONENTS.md) — accessibility-focused deep dives on the
  `Select` combobox pattern, reduced-motion controls, and mobile touch targets.
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — how these pieces fit together
  (component hierarchy, data flow, state management patterns).

## Conventions used on these pages

- `### functionName(params): ReturnType` headings are exact signatures copied from source.
- Parameters and props are listed in tables where there are more than one or two.
- Every hook/component/util has at least one fenced usage example.
- Internal-only helpers (not exported, or exported only for tests) are omitted.
