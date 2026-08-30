# Code Review Guidelines

This document defines the standards every PR must meet before merging. Reviewers
cover performance, accessibility, security, and Stellar contract interactions in
addition to correctness.

## Review Workflow

1. **Author self-review**: lint, typecheck, unit tests, and build must pass locally
   before opening a PR (see `package.json` scripts).
2. **CI must be green**: all CLI tests and checks pass on the branch before merge.
3. **Two focused reviewers**: at least one reviewer should be familiar with the
   Stellar/blockchain code paths.
4. **Requested changes** must be resolved and re-verified before approval.

## TypeScript & React Patterns

- Types are used over `any`. New code must compile with `noUnusedLocals` and the
  strict settings in `tsconfig.app.json`.
- Use `type` imports for type-only imports (`import type { … }`).
- Hooks follow the Rules of Hooks; no conditional/dependent hook calls.
- Functional components only; no class components without justification.
- Effects have proper cleanup (timers, streams, subscriptions).
- Inline styles are acceptable where components already follow that pattern, but
  shared design tokens belong in `src/constants` / CSS classes.
- No dead code or unused exports; remove scaffolding and placeholder branches.

## Performance

- Re-renders: verify expensive list/3D components are memoized or keyed
  correctly; avoid creating new callbacks/objects in render for hot paths.
- The 3D scene must remain at target FPS on mobile — prefer `performanceMode`
  toggling over unconditional heavy post-processing.
- No oversized bundles: new dependencies require justification; use dynamic
  `import()` for large libraries.
- Avoid network waterfalls; batch Horizon/RPC calls where possible.

## Accessibility

- New UI meets WCAG 2.1 AA (see `docs/ACCESSIBILITY.md`).
- Interactive elements have accessible names (`aria-label` or visible text).
- Keyboard navigation is fully supported (focus order, focus-visible styles,
  Escape handling for modals/dialogs).
- Color contrast ≥ 4.5:1 for body text.
- Run the a11y test suites and axe scans for any changed component:
  `npm run test:a11y`.

## Blockchain & Wallet Security

- Never log private keys, seed phrases, XDR transaction blobs, or raw signed
  payloads.
- Only include the data required by the transaction; warn the user about
  transaction effects before signing.
- Validate all user input and address/asset parameters before submitting to
  Horizon or RPC; never trust client-side values as authoritative.
- Wallet connections must go through `WalletContext` — do not call wallet
  extension APIs directly in components.
- Handle user rejection/cancellation of signing gracefully (no unhandled
  rejections, clear toast feedback).
- Reverify that no PII or balances leak into monitoring/analytics payloads.

## Contract Interactions

- Every `signTransaction` call states the operation intent to the user and
  captures the failure path (`upgrade_failed`, etc.).
- Fee/network selection must come from the persisted network config, never
  hardcoded per-wallet assumptions.
- Balance and account reads use the configured Horizon server; streams are
  closed on unmount.

## Testing Requirements

- Unit tests accompany new components/hooks (refer to `src/__tests__` and the
  component `__tests__` folders).
- Coverage thresholds (see `vitest.config.ts`) must not regress.
- Add/adjust e2e specs in `e2e/` when user flows change.
- Event names must follow the analytics taxonomy in `docs/ANALYTICS.md`
  (`locale` codes should be lowercased BCP-47 tags, event names in `snake_case`).
  Validate that new events use consistent naming before merging.

## Checking Off

A PR is approvable when all of the above pass. Default to requesting changes —
never approve with known violations, and keep the review scoped to the PR's intent.
