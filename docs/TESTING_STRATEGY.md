# Testing Strategy

This document describes the unified testing strategy for Nebula Nomad: when and where to use each test type, coverage targets, mocking strategies, and how tests integrate with CI/CD. It is the source of truth for testing consistency and quality across the repository.

## Testing Pyramid

Follow the classic testing pyramid. Write many fast, low-level unit tests, fewer integration tests, and a small number of high-value E2E and performance tests. Do not write E2E tests for logic that can be covered by a unit test.

```
          /\
         /  \        E2E + Performance (few, slow, high value)
        /----\
       /  E2E \
      /--------\
     /          \   Integration / Component (medium)
    /  Component \
   /--------------\
  /                \  Unit tests (many, fast, cheapest)
 /      Unit        \
/--------------------\
```

| Layer         | Tooling                             | Scope                                          | Speed       | Where                              |
| ------------- | ----------------------------------- | ---------------------------------------------- | ----------- | ---------------------------------- |
| Unit          | Vitest (`happy-dom`)                | Individual functions, classes, pure logic      | Fast        | `*.test.ts` co-located with source |
| Component     | Vitest + Testing Library            | A single component rendered in isolation       | Fast–medium | `*.test.tsx` in `__tests__`        |
| Accessibility | Vitest + `jest-axe`                 | Keyboard nav, ARIA roles/labels, contrast      | Fast–medium | `src/__tests__/a11y/`              |
| Storybook     | Vitest + `@storybook/addon-vitest`  | Stories render in a browser without error      | Medium      | `.storybook`, `*.stories.tsx`      |
| Performance   | Vitest (FPS/memory) + Lighthouse CI | Render smoothness, bundle budget, load metrics | Medium      | `test/performance/`                |
| E2E           | Playwright                          | Full user journeys in a real browser           | Slow        | `e2e/*.spec.ts`                    |

## When to Use Each Test Type

### Unit Tests — default choice

Use for pure logic, utilities, stores, and services with no DOM dependency:

- Stellar utilities (`retryAsync`, response parsing, fee estimation, balance formatting, batch transactions)
- Contract logic (upgrade requirements, validation)
- Stores, config (`env`, `stellar`), analytics
- Procedural generation utilities

**Rule:** If you can test it without rendering a component, write a unit test.

### Component Tests

Use for a single `src/components/...` unit rendered with Testing Library:

- Interacting with user events (`@testing-library/user-event`)
- Asserting state changes, toasts, and conditional rendering
- Mocking hooks/services/hooks the component depends on

### Accessibility Tests

Every interactive component should have an a11y test covering keyboard navigation, focus management, and ARIA semantics. See `docs/ACCESSIBILITY.md` for the full compliance policy.

### Storybook Interaction Tests

When writing a `*.stories.tsx`, ensure it renders in the Vitest Storybook project (browser-backed). This validates the component and its stories compile and mount.

### Performance Tests

Use for anything on the hot path:

- FPS / frame-rate and memory-leak regressions (`npm run performance:test`)
- Lighthouse budgets for load and bundle size (`npm run performance:ci`)

See `docs/performance-testing.md` for targets and interpretation.

### E2E Tests

Use for full user journeys that span multiple components, routing, and wallet interaction:

- Connect a wallet → scan a nebula → confirm resources
- Ship upgrade flow end-to-end
- Primary navigation and page transitions

Keep E2E count small and stable. Never use E2E to assert implementation details.

## Coverage Targets

Coverage is collected with `@vitest/coverage-v8` (`src`) and enforced by thresholds in `vitest.config.ts`:

| Metric     | Target |
| ---------- | ------ |
| Lines      | ≥ 80%  |
| Functions  | ≥ 80%  |
| Branches   | ≥ 80%  |
| Statements | ≥ 80%  |

Run locally:

```bash
npm run test:coverage
```

Coverage excludes `src/test/**`, `*.d.ts`, and `src/main.tsx` (bootstrap). The CI pipeline fails if any threshold is not met. In addition to coverage, static gates run on every PR via `npm run lint`, `npm run build` (TypeScript), and Prettier (`npm run format:check`).

## Mocking Strategies

Mock at the boundaries, not internally. Prefer dependency injection and lightweight mocks over heavy module mocking.

### External Side Effects

Mock wallet adapters, RPC/Horizon servers, `fetch`, and `localStorage` — never hit real networks in tests.

```ts
// services/wallets/__tests__/albedo.test.ts
vi.mock('@albedo-link/intent', () => ({
  getPublicKey: vi.fn().mockResolvedValue('G...'),
}))
```

### Services Used by Components

Use `vi.mock` on the service module and keep the mock near the import path.

```ts
vi.mock('@/services/assets/resources', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/assets/resources')>()),
  fetchResourceAssetSnapshot: vi.fn().mockResolvedValue(mockSnapshot),
}))
```

### Hooks / Contexts

Wrap test components in the real `WalletProvider` / `NetworkProvider` and mock only the wallet services, or mock the hook with `vi.mock` and assert on the component's rendered output.

### Time & Timers

- Use Vitest fake timers (`vi.useFakeTimers()`) for debounce, polling, and sync intervals.
- Prefer `waitFor`/`findBy*` from Testing Library over arbitrary `setTimeout`.

### Good Practices

- Never mock the unit under test.
- Favor `@/test/factories` for fixtures (resource snapshots, NFT records, scan results).
- Keep mocks type-safe; include the original module's types.

## CI/CD Integration

CI is defined in `.github/workflows/`. Each workflow maps to the relevant test/check tier.

| Workflow                | Tests / checks                                                                | Trigger        |
| ----------------------- | ----------------------------------------------------------------------------- | -------------- |
| `ci.yml`                | Unit + component + Storybook tests, coverage, `lint`, `build`, `format:check` | PR to `main`   |
| `e2e.yml`               | Playwright E2E suite                                                          | PR to `main`   |
| `performance.yml`       | Lighthouse CI + performance tests, bundle budget                              | PR to `main`   |
| `accessibility.yml`     | a11y tests, axe scans                                                         | PR to `main`   |
| `visual-regression.yml` | Chromatic storybook snapshots                                                 | PR to `main`   |
| `release.yml`           | semantic-release on merge                                                     | push to `main` |

### Local checks before pushing

```bash
npm run lint              # ESLint
npm run format:check      # Prettier
npm run build             # TypeScript + Vite build
npm run test              # unit + component + storybook
npm run test:a11y         # accessibility
npm run test:coverage     # coverage thresholds
npm run performance:test  # FPS + memory regression
npm run e2e               # Playwright (requires browsers installed)
```

The pre-push/pre-commit hooks (`.husky`) run lint-staged on staged files.

## Test Naming & Organization

- Co-locate unit/component tests with the code they cover (`src/.../__tests__/*.test.[ts|tsx]`).
- Group a11y tests under `src/__tests__/a11y/`.
- Group performance tests under `test/performance/`.
- Group E2E specs under `e2e/`.
- Name tests with behavior-oriented descriptions: `it('disables the button while scanning')`.

## Adding a New Test

1. Decide the correct tier using the pyramid above.
2. Place the test in the matching directory.
3. Reuse `src/test/factories` for fixtures.
4. Mock only external boundaries.
5. Run the corresponding command above and confirm exactly one new test fails without your code change, then passes with it:

```bash
npm run test -- src/path/to/your.test.ts
```

## Troubleshooting

- **Storybook/browser tests fail with "Playwright browsers not installed":** run `npx playwright install chromium`.
- **Coverage thresholds not met:** the code you added needs more tests — fix coverage, don't lower the threshold.
- **Pre-push hook blocks push:** run lint-staged, `npm run format`, and `npm run lint` to fix staged files.
