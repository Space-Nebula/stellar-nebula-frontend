# Contributing to Nebula Nomad

Thanks for your interest in contributing to the Nebula Nomad frontend! This guide covers the
contribution process end to end: reporting issues, picking work, branching, committing, and
getting a pull request merged.

For the hands-on environment setup (Node version, env vars, Docker, running tests/Storybook),
see **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**. For code style and naming conventions, see
**[docs/CODE_STYLE.md](docs/CODE_STYLE.md)**.

## Code of Conduct

By participating in this project, you agree to abide by our
[Code of Conduct](docs/CODE_OF_CONDUCT.md).

## Ways to Contribute

### Reporting Bugs

- Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).
- Give a clear, descriptive title and steps to reproduce.
- State the expected vs. actual behavior.

### Suggesting Features

- Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).
- Describe the problem the feature solves and why it's useful.

### Picking Up an Issue

- Issues labeled `good-first-issue` are a good entry point for newcomers.
- Comment on the issue to let others know you're working on it before starting, to avoid
  duplicate work.

## Development Setup

See **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** for the full guide. In short:

```bash
git clone https://github.com/Space-Nebula/stellar-nebula-frontend.git
cd stellar-nebula-frontend
npm install
cp .env.example .env.local
npm run dev
```

## Making Changes

### Branching

Branch from `main` using one of these prefixes:

- `feat/feature-name` — new functionality
- `fix/bug-name` — bug fixes
- `docs/documentation-change` — documentation-only changes
- `chore/maintenance-task` — tooling, deps, CI, refactors with no behavior change

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) style messages
(e.g. `feat: add scan animation`, `fix: handle expired session on reconnect`). The changelog is
generated from these, so keep the subject line accurate and in the imperative mood.

### Code Style

Run `npm run lint` and `npm run format` before committing — Prettier also runs automatically on
staged files via the Husky pre-commit hook. See
**[docs/CODE_STYLE.md](docs/CODE_STYLE.md)** for naming conventions, path aliases, and TypeScript
rules. All new code must be TypeScript, and should follow the existing folder structure
(`src/components`, `src/hooks`, `src/services`, `src/store`, `src/utils`).

### Tests

- Add or update unit tests for any behavior change (`npm run test`).
- Keep coverage at or above the existing thresholds (`npm run test:coverage`).
- Add an accessibility check for new interactive UI (`npm run test:a11y`) where relevant.
- See [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) for which test type to use when.

### Documentation

Update relevant docs alongside code changes — most commonly `docs/API_REFERENCE.md` or
`docs/API/` for new hooks/components/utilities, and `docs/ERROR_CODES.md` for new failure modes.

## Smart Contract Integration

This section covers integrating new Soroban contracts or modifying existing contract
interactions. Always run the full checks under [Running Checks](#running-checks) before pushing
contract-related changes.

### Where contract code lives

- **Typed client:** `src/services/contracts/soroban.ts` (`SorobanContractClient`) builds and
  submits contract transactions.
- **Ship upgrade logic:** `src/services/contracts/shipUpgrade.ts` (pure helpers + transaction
  builder).
- **React hooks:** `src/hooks/contracts/` (`useNebulaScan`, `useShipUpgrade`).
- **Response parsing:** `src/utils/stellar/responseParser.ts` converts contract return-value XDR
  to native values.
- **Retry/simulation helpers:** `src/utils/stellar/retry.ts`, `src/utils/stellar/simulate.ts`.

### Adding a new contract interaction

1. **Extend or create the typed client** in `src/services/contracts/`. Expose a
   `build*Transaction` method that returns an unsigned XDR for the caller to sign, and a
   `submit*Transaction` method that submits, polls, and parses the result.
2. **Define public types** (`*Params`, `*Result`) and export them from
   `src/services/contracts/index.ts`.
3. **Add a hook** in `src/hooks/contracts/` that wraps the client and manages
   `isLoading`/`error`/`result`, following `useNebulaScan` as the template. Re-export it from
   `src/hooks/index.ts`.
4. **Parse return values** through `parseContractResponseXdr` and guard with
   `ContractResponseParseError` handling.
5. **Wire config** through `@config/stellar` (`getActiveStellarConfig`) and per-network contract
   IDs, so the transaction always targets the active network.
6. **Document the new API** in `docs/API_REFERENCE.md` (or `docs/API/hooks.md`).
7. **Document new failures** in `docs/ERROR_CODES.md` with a `C-` code, cause, resolution, and
   monitoring tags.

### Contract testing guidelines

- **Mock the boundary, not the internals.** Unit-test the pure helpers
  (`calculateUpgradeRequirements`, `validateUpgrade`, response parsing) directly.
- **For hooks**, mock the wallet and contract client modules and assert on
  `isLoading`/`error`/`result` transitions (see `src/hooks/contracts/__tests__/`).
- **Reuse `src/test/factories`** for NFT records, resource snapshots, and scan results.
- **Never hit a live RPC/Horizon network** in tests; mock servers and `fetch`.
- Cover: success, user cancellation (no retry), on-chain failure, malformed responses, and
  timeouts.
- Keep coverage thresholds at 80% across lines/branches/functions/statements
  (`npm run test:coverage`).

### Integration patterns

- Prefer the **single hook owns its lifecycle** pattern: build → sign (via wallet) → submit →
  poll → parse. Never duplicate this logic in components.
- **Always sign through the wallet adapters** (`@services/wallets`), never in the client.
- **Validate inputs before building** transactions; sanitize user-supplied strings, amounts, and
  account IDs.
- **Return hashes/results**, don't swallow errors; surface structured errors for error-tracking
  tags.

### Type generation guidelines

- **Hand-write or codegen strict TypeScript interfaces** for contract params and results; export
  them from the contracts barrel.
- Never use `any`/`unknown` for contract return shapes. Prefer the generic
  `parseContractResponseXdr<T>` with an explicit `T`.
- Use `ContractNativeValue`/`ContractNativePrimitive` from `responseParser.ts` for loosely-typed
  raw values only.
- Keep resource/asset/nft types in `src/types/` or the relevant service module, and reuse them
  across hooks.

### Contract PR checklist

- [ ] New/interfacing contract functions covered by unit tests
- [ ] `npm run test:coverage` thresholds met
- [ ] `docs/API_REFERENCE.md` updated
- [ ] `docs/ERROR_CODES.md` updated for new failure modes
- [ ] Wallet signing stays adapter-delegated and network-aware
- [ ] No secrets in the frontend for authorizing contract state changes

## Running Checks

Always run these locally before pushing — they mirror what CI runs:

```bash
npm run lint
npm run format:check
npm run build          # TypeScript + Vite
npm run test
npm run test:coverage
npm run test:a11y
npm run performance:test
```

## Submitting a Pull Request

1. Push your branch and open a PR against `main`.
2. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) — link the issue(s) it closes
   (e.g. `Closes #123`), describe what changed and why, and check off the verification checklist.
3. Make sure CI is green (lint, format, build, tests, a11y, performance budgets).
4. A maintainer will review; please respond to review comments with follow-up commits rather than
   force-pushing over them mid-review, so the diff stays easy to re-review.
5. A PR needs at least one approval and a passing CI run before it's merged.

## Questions?

If you have questions, open an issue or ask in the Stellar Discord `#soroban` channel.
