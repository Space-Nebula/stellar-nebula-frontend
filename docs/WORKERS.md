# Web Workers

This document describes the Web Worker infrastructure used to keep expensive, pure
calculations off the main thread (#383).

## Background & Problem

Lighthouse reported long tasks (> 50 ms) during interactions, driven primarily by
`generateNebulaGeometry` (`src/utils/procedural/nebula.ts`): a synchronous, pure function
that builds position/color/size/opacity buffers for up to 100 000 particles. Running it
on the main thread - previously inside a `useMemo` in `useProceduralNebula` - blocked
rendering and input handling for the full duration of the calculation, directly
increasing Total Blocking Time (TBT).

## Architecture

### `useWorker` (`src/hooks/useWorker.ts`)

A generic hook that manages a single Web Worker for the lifetime of a component and
exposes a request/response API instead of raw `postMessage`/`onmessage`:

```ts
const { run, isSupported, terminate } = useWorker<TRequest, TResponse>(
  () => new Worker(new URL('../workers/some-worker.ts', import.meta.url), { type: 'module' })
)

const result = await run(payload)
```

- The worker is created lazily, on the first `run()` call, and reused across calls.
- Every request is tagged with a unique `requestId`; the worker must echo it back so
  responses can be matched to callers even if multiple requests are in flight.
- `isSupported` is `false` when the `Worker` API is unavailable (some SSR/test
  environments, very old browsers), so callers can fall back to a synchronous path.
- The worker is terminated automatically on unmount.

### `nebula-worker` (`src/workers/nebula-worker.ts`)

A dedicated worker module that imports `generateNebulaGeometry` and runs it in response
to `{ requestId, payload }` messages, replying with `{ requestId, result }` (or
`{ requestId, error }` if generation throws). Generated typed-array buffers are
**transferred**, not copied, back to the main thread, since the worker has no further
use for them.

Vite bundles the worker as its own chunk via the `new Worker(new URL(...), { type:
'module' })` pattern; no extra build configuration is required.

### `useProceduralNebula` (`src/hooks/useProceduralNebula.ts`)

Consumes `useWorker` to generate nebula geometry off the main thread:

- Returns `{ geometry, isLoading }`; `isLoading` is `true` while a worker request is
  in flight.
- Falls back to calling `generateNebulaGeometry` synchronously when `isSupported` is
  `false`, or if the worker request rejects, so a nebula is always produced even in
  worker-less environments.
- Guards against stale responses: if the seed/pattern/particleCount/radius change
  again before an in-flight request resolves, that request's result is discarded.

## Adding a new worker

1. Create `src/workers/<name>-worker.ts`. Keep the underlying computation itself as a
   pure function in `src/utils/` (or wherever makes sense) so it can also be unit
   tested directly, without a worker in the loop.
2. In the worker file, `addEventListener('message', ...)` for `{ requestId, payload }`
   and `postMessage({ requestId, result })` (or `{ requestId, error }`) back.
3. In the consuming hook/component, call `useWorker(() => new Worker(new URL(...), {
type: 'module' }))` and `run(payload)`.
4. Always provide a synchronous fallback when `isSupported` is `false` or `run()`
   rejects - do not assume every environment can run workers.

## Testing worker communication

- `src/hooks/__tests__/useWorker.test.ts` exercises the request/response contract
  (matching by `requestId`, error propagation, worker reuse, termination on unmount)
  against an in-memory `FakeWorker` double, so it runs without needing real Worker
  support in the test environment.
- `src/hooks/__tests__/useProceduralNebula.test.ts` exercises `useProceduralNebula`'s
  worker delegation and its synchronous fallback paths by mocking `useWorker`.

## Content Security Policy

`index.html`'s CSP already includes `worker-src 'self' blob:'`, which is required for
Vite's bundled, module-type workers to be allowed to run.
