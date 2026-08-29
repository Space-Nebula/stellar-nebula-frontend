# Contributing to Nebula Nomad

Thank you for your interest in contributing to Nebula Nomad! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

- Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).
- Provide a clear and descriptive title.
- Include steps to reproduce the issue.
- Describe the expected and actual behavior.

### Suggesting Features

- Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).
- Describe the goal of the feature.
- Explain why this feature would be useful.

### Pull Requests

1. Fork the repository and create your branch from `main`.
2. Follow the branch naming convention:
   - `feat/feature-name`
   - `fix/bug-name`
   - `docs/documentation-change`
   - `chore/maintenance-task`
3. Ensure your code follows the established style (run `npm run lint`).
4. Update documentation if necessary.
5. Write tests for new features.
6. Submit a Pull Request with a clear description of the changes.

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Coding Style

- We use ESLint and Prettier for code formatting.
- TypeScript is required for all new code.
- Follow the project's folder structure for components and hooks.

## Smart Contract Integration

This section covers integrating new Soroban contracts or modifying existing contract interactions. Always run the full checks described under [Running Checks](#running-checks) before pushing contract-related changes.

### Where contract code lives

- **Typed client:** `src/services/contracts/soroban.ts` (`SorobanContractClient`) builds and submits contract transactions.
- **Ship upgrade logic:** `src/services/contracts/shipUpgrade.ts` (pure helpers + transaction builder).
- **React hooks:** `src/hooks/contracts/` (`useNebulaScan`, `useShipUpgrade`).
- **Response parsing:** `src/utils/stellar/responseParser.ts` converts contract return-value XDR to native values.
- **Retry/simulation helpers:** `src/utils/stellar/retry.ts`, `src/utils/stellar/simulate.ts`.

### Adding a new contract interaction

1. **Extend or create the typed client** in `src/services/contracts/`. Expose a `build*Transaction` method that returns an unsigned XDR for the caller to sign, and a `submit*Transaction` method that submits, polls, and parses the result.
2. **Define public types** (`*Params`, `*Result`) and export them from `src/services/contracts/index.ts`.
3. **Add a hook** in `src/hooks/contracts/` that wraps the client and manages `isLoading`/`error`/`result`, following `useNebulaScan` as the template. Re-export it from `src/hooks/index.ts`.
4. **Parse return values** through `parseContractResponseXdr` and guard with `ContractResponseParseError` handling.
5. **Wire config** through `@config/stellar` (`getActiveStellarConfig`) and per-network contract IDs, so the transaction always targets the active network.
6. **Document the new API** in `docs/API_REFERENCE.md`.
7. **Document new failures** in `docs/ERROR_CODES.md` with a `C-` code, cause, resolution, and monitoring tags.

### Contract testing guidelines

- **Mock the boundary, not the internals.** Unit-test the pure helpers (`calculateUpgradeRequirements`, `validateUpgrade`, response parsing) directly.
- **For hooks**, mock the wallet and contract client modules and assert on `isLoading`/`error`/`result` transitions (see `src/hooks/contracts/__tests__/`).
- **Reuse `src/test/factories`** for NFT records, resource snapshots, and scan results.
- **Never hit a live RPC/Horizon network** in tests; mock servers and `fetch`.
- Cover: success, user cancellation (no retry), on-chain failure, malformed responses, and timeouts.
- Keep coverage thresholds at 80% across lines/branches/functions/statements (`npm run test:coverage`).

### Integration patterns

- Prefer the **single hook owns its lifecycle** pattern: build → sign (via wallet) → submit → poll → parse. Never duplicate this logic in components.
- **Always sign through the wallet adapters** (`@services/wallets`), never in the client.
- **Validate inputs before building** transactions; sanitize user-supplied strings, amounts, and account IDs.
- **Return hashes/results**, don't swallow errors; surface structured errors for error-tracking tags.

### Type generation guidelines

- **Hand-write or codegen strict TypeScript interfaces** for contract params and results; export them from the contracts barrel.
- Never use `any`/`unknown` for contract return shapes. Prefer the generic `parseContractResponseXdr<T>` with an explicit `T`.
- Use `ContractNativeValue`/`ContractNativePrimitive` from `responseParser.ts` for loosely-typed raw values only.
- Keep resource/asset/nft types in `src/types/` or the relevant service module, and reuse them across hooks.

### Contract PR checklist

- [ ] New/interfacing contract functions covered by unit tests
- [ ] `npm run test:coverage` thresholds met
- [ ] `docs/API_REFERENCE.md` updated
- [ ] `docs/ERROR_CODES.md` updated for new failure modes
- [ ] Wallet signing stays adapter-delegated and network-aware
- [ ] No secrets in the frontend for authorizing contract state changes

## Running Checks

Always run these before pushing (matching CI):

```bash
npm run lint
npm run format:check
npm run build          # TypeScript + Vite
npm run test
npm run test:coverage
npm run test:a11y
npm run performance:test
```

See `docs/TESTING_STRATEGY.md` for when to use each test type.

## Questions?

If you have any questions, feel free to open an issue or reach out to the maintainers.
