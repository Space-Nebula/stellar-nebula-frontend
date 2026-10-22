# Development Guide

A hands-on guide to getting the Nebula Nomad frontend running locally, exercising it against a
backend, and running the project's checks before you open a PR. For the contribution _process_
(branching, commits, PRs), see [../CONTRIBUTING.md](../CONTRIBUTING.md).

## Prerequisites

- **Node.js 18+** and npm (the repo uses npm, not yarn/pnpm — see `package-lock.json`).
- A **Stellar testnet wallet** browser extension, e.g. [Freighter](https://www.freighter.app/) or
  [Albedo](https://albedo.link/), for exercising wallet-connect and signing flows.
- A **funded Futurenet/testnet account** — get test XLM from the
  [Stellar Laboratory friendbot](https://lab.stellar.org).
- Optionally, **Docker** if you'd rather not install Node locally (see [Docker](#docker) below).

## Clone and Install

```bash
git clone https://github.com/Space-Nebula/stellar-nebula-frontend.git
cd stellar-nebula-frontend
npm install
```

## Environment Variables

Copy the example env file and adjust as needed:

```bash
cp .env.example .env.local
```

All variables are `VITE_*`-prefixed and embedded into the client bundle at build time. The
defaults in `.env.example` target Stellar **testnet** and a local backend at
`http://localhost:3000/api`. See **[ENVIRONMENT.md](ENVIRONMENT.md)** for the full reference of
every variable, its default, and when it's required (e.g. contract IDs are only required once
you're submitting real transactions).

## Running the Dev Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), connect a wallet, and you should be able to
scan a nebula against whichever network `VITE_STELLAR_NETWORK` points at.

## Running Against a Backend

- Deploy the [backend Soroban contracts](https://github.com/Space-Nebula/stellar-nebula-nomad) to
  Futurenet/testnet (see that repo's README), or point `VITE_NEBULA_CONTRACT_ID` /
  `VITE_TOKEN_CONTRACT_ID` at already-deployed contract IDs.
- For UI/offline development without a live backend or contracts, prefer running the test suite
  (which mocks the network boundary — see [Testing](#testing) below) rather than hand-wiring a
  local backend.

## Docker

The project can run entirely in Docker, which avoids installing Node locally:

### Development

```bash
npm run docker:dev
```

Starts the dev server with hot reloading at `http://localhost:5173` (see `docker-compose.yml`
and `Dockerfile` for the dev image).

### Production build

```bash
npm run docker:build
npm run docker:prod
```

Builds and serves the production image at `http://localhost:8080` (see `Dockerfile.prod`).

## Testing

The project has several test layers; pick the narrowest one that exercises your change:

| Command                          | What it runs                                                               |
| -------------------------------- | -------------------------------------------------------------------------- |
| `npm run test`                   | Unit/component tests (Vitest + Testing Library), excluding Storybook tests |
| `npm run test:watch`             | Same, in watch mode                                                        |
| `npm run test:all`               | Every Vitest project, including Storybook                                  |
| `npm run test:coverage`          | Unit/component tests with coverage thresholds enforced                     |
| `npm run test:integration`       | Integration-tagged tests                                                   |
| `npm run test:a11y`              | Accessibility tests under `src/__tests__/a11y/`                            |
| `npm run test:storybook`         | Storybook interaction tests                                                |
| `npm run test:e2e`               | Playwright end-to-end tests                                                |
| `npm run performance:test`       | FPS/memory/render-budget unit tests under `test/performance/`              |
| `npm run performance:lighthouse` | Lighthouse CI against the built app                                        |

See **[TESTING_STRATEGY.md](TESTING_STRATEGY.md)** for guidance on which layer to add new tests
to, and **[CONTRACT_TESTING.md](CONTRACT_TESTING.md)** for contract-interaction-specific patterns.

## Storybook

UI components are developed and documented in isolation with Storybook:

```bash
npm run storybook          # dev server, http://localhost:6006
npm run build-storybook    # static build
npm run chromatic          # visual regression against the Chromatic baseline
```

## Linting, Formatting, and Type Checking

```bash
npm run lint          # ESLint
npm run lint:fix       # ESLint, auto-fixing what it can
npm run format         # Prettier, writes changes
npm run format:check   # Prettier, check-only (what CI runs)
npm run build          # tsc -b (type check) + vite build
```

Prettier also runs automatically on staged files via the Husky `pre-commit` hook
(`lint-staged`), so most formatting issues are caught before a commit even completes. See
**[CODE_STYLE.md](CODE_STYLE.md)** for the conventions these tools enforce.

## Building for Production

```bash
npm run build
```

Type-checks the project (`tsc -b`) and produces an optimized bundle in `dist/`. Use
`npm run bundle:analyze` / `npm run bundle:check` to inspect bundle size against the tracked
baseline, and `npm run preview` to serve the built output locally.

## Before You Push

Run the full check suite described in [CONTRIBUTING.md § Running Checks](../CONTRIBUTING.md#running-checks)
— it mirrors what CI runs on every PR.
