# Deployment Guide

Complete deployment instructions for the Nebula Nomad frontend: local Docker workflows, Vercel, Netlify, environment variables, monitoring setup, and rollback procedures.

## Overview

The app is a static-client React + Vite application. The production build (`npm run build`) outputs static assets to `dist/` that can be served by Docker/Nginx, Vercel, Netlify, or any static host. Because everything is client-side, deployment is a build-time concern — there is no server runtime.

The process is intentionally the same across environments: build with the correct `VITE_*` env vars, then serve the `dist/` output behind `index.html` SPA routing.

## Prerequisites

- Node.js 20 (matching the CI `NODE_VERSION`)
- npm
- A Stellar network (testnet/futurenet for staging, mainnet for production)
- Deployed Soroban contract IDs for your target network
- Optional: Sentry DSN, LogRocket App ID, analytics endpoint

## Build & Environment Variables

Copy `.env.example` to `.env.local` for local development. Reference `.env.staging` and `.env.production` as templates for those environments. For full details on all supported options, see [ENVIRONMENT.md](ENVIRONMENT.md).

### Production Variables Checklist

When configuring CI/CD secrets or cloud provider variables (Vercel, Netlify, Docker), ensure the following values are defined:

| Variable                   | Required    | Production Value                                 | Purpose                                                     |
| -------------------------- | ----------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `VITE_APP_ENV`             | **Yes**     | `production`                                     | Enables production optimizations, disables debug overlays   |
| `VITE_STELLAR_NETWORK`     | **Yes**     | `mainnet`                                        | Points wallet connections to Public Global Stellar Network  |
| `VITE_STELLAR_RPC_URL`     | **Yes**     | `https://soroban-rpc.stellar.org`                | Mainnet Soroban RPC endpoint                                |
| `VITE_STELLAR_HORIZON_URL` | **Yes**     | `https://horizon.stellar.org`                    | Mainnet Horizon REST API endpoint                           |
| `VITE_STELLAR_PASSPHRASE`  | **Yes**     | `Public Global Stellar Network ; September 2015` | Required network passphrase for valid mainnet tx signatures |
| `VITE_NEBULA_CONTRACT_ID`  | **Yes**     | Deployed C... contract address                   | Production Soroban Nebula smart contract address            |
| `VITE_TOKEN_CONTRACT_ID`   | **Yes**     | Deployed C... contract address                   | Production Soroban Token smart contract address             |
| `VITE_API_BASE_URL`        | **Yes**     | `https://api.stellarnebula.io/api`               | Production Nomad REST API backend                           |
| `VITE_API_TIMEOUT_MS`      | No          | `10000`                                          | HTTP request timeout limit (default 10s)                    |
| `VITE_SENTRY_DSN`          | Recommended | `https://...@sentry.io/...`                      | Sentry exception ingestion DSN                              |
| `VITE_LOGROCKET_APP_ID`    | Optional    | `org/app`                                        | LogRocket production session telemetry                      |
| `VITE_ENABLE_MONITORING`   | Optional    | `true`                                           | Enables crash and performance telemetry                     |
| `VITE_LOG_LEVEL`           | Optional    | `warn`                                           | Suppresses verbose info logs in production                  |
| `VITE_ENABLE_DEV_TOOLS`    | Optional    | `false`                                          | Disables debug panels for end users                         |
| `VITE_ENABLE_FPS_COUNTER`  | Optional    | `false`                                          | Disables developer FPS counter                              |

> **Security:** all `VITE_*` values are public once built into client bundles. Contract IDs and DSNs are public identifiers, not secrets, but they should still be injected at deploy time via your platform's env/secrets mechanism rather than committed to git. Contract secret keys must never live in the frontend.

Verify env files are **not** committed (they are gitignored; only `.env.example` is tracked).

## Build

```bash
npm ci
npm run build   # runs tsc -b && vite build, outputs dist/
npm run preview # optional: serve the built output locally
```

## Deployment Targets

### Docker

The container workflow is optimized with multi-stage builds and layer caching (#366) to ensure production images remain minimal (<150MB, typically ~25–40MB) and build times are expedited.

**Development** (`Dockerfile`)

Multi-stage development build isolating dependency installation (`npm ci`) and mounting application code for hot reloading:

```bash
docker-compose up dev # serves Vite dev server on :5173
```

**Production** (`Dockerfile.prod`)

Multi-stage pipeline:

1. `deps`: Installs production dependencies with layer caching.
2. `builder`: Executes `npm run build` to generate compiled static assets in `/app/dist`.
3. `runner`: Minimal `nginx:alpine` runtime serving only `/app/dist`. No `node_modules` or development dependencies are packaged into the final image.

```bash
docker-compose up prod # builds and serves on :8080
```

Custom builds:

```bash
docker build -f Dockerfile.prod -t nebula-nomad:latest .
docker run --rm -p 8080:80 -e VITE_STELLAR_NETWORK=mainnet nebula-nomad:latest
```

The production container includes custom `nginx.conf` providing SPA client routing fallbacks, gzip compression, asset cache headers (`/assets/` cached for 1 year), and a `/health` endpoint.

### Vercel

The repo includes `vercel.json` using the `@vercel/static-build` builder with `distDir: dist` and SPA rewrites to `index.html`.

1. Import the repository in Vercel.
2. Set **Build Command**: `npm run build`
3. Set **Output Directory**: `dist`
4. Add the environment variables from the table above (under Settings → Environment Variables), separately for Production/Preview.
5. Deploy. Vercel serves the static bundle and rewrites routes to `index.html`.

### Netlify

Netlify supports the same static flow.

1. Import the repository.
2. Set **Build command**: `npm run build`
3. Set **Publish directory**: `dist`
4. Add environment variables under Site settings → Environment variables.
5. For SPA routing add a `netlify.toml` redirect (or use `vercel.json`-style rewrites):

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pages (CI previews)

The `ci.yml` workflow builds and publishes a PR preview to `gh-pages` under `pr-preview/<number>/`. This validates builds on every PR automatically.

## Monitoring Setup

Monitoring is initialized in `src/main.tsx` via `initializeMonitoring` (see `src/services/monitoring.ts`).

### Sentry

1. Create a Sentry project (React).
2. Set `VITE_SENTRY_DSN` to the project DSN for the environment.
3. Keep `VITE_ENABLE_MONITORING=true`.
4. Set `VITE_SENTRY_ENVIRONMENT` (or the equivalent) to `staging`/`production` so releases are distinguishable.
5. Optimize sampling with `tracesSampleRate`/replay rates — production defaults keep performance sampling low and replay-on-error enabled.

### LogRocket

1. Create a LogRocket project.
2. Set `VITE_LOGROCKET_APP_ID`.
3. Replay sessions appear in LogRocket; set `VITE_LOG_LEVEL` appropriately (e.g. `warn`/`error` in prod).

### Analytics

Set `VITE_ANALYTICS_ENDPOINT` if a custom analytics backend is used. The client strips PII before sending (see `docs/ANALYTICS.md`).

### Verify monitoring after deploy

- [ ] Confirm a test error appears in the Sentry project for the correct environment.
- [ ] Confirm a session replay is captured in LogRocket.
- [ ] Confirm `VITE_APP_ENV` reflects the deployed environment in the bundle.

## Staging → Production Promotion

1. Deploy `main` to staging first and run the full E2E + performance suites against the deployed URL.
2. Verify: wallet connect (Freighter/Albedo), nebula scan, ship upgrade, transaction confirmations, monitoring dashboards.
3. Confirm the staging env uses testnet/futurenet and its contract IDs.
4. On green, promote the same `main` commit to production with mainnet env vars and production contract IDs.

## Rollback Procedures

### Instant rollback on Vercel/Netlify

Both platforms retain deployment history:

- **Vercel:** Deployments → choose a previous deployment → "Promote to Production".
- **Netlify:** Deploys → pick prior deploy → "Publish deploy".

This requires no new build or release.

### Revert via git (drives a new release)

Follow `RELEASE.md` rollback procedures:

```bash
git revert <bad-commit-sha> --no-edit
git push origin main   # triggers a PATCH release + redeploy
```

### Emergency hotfix

```bash
git checkout -b hotfix/description v<last-good-version>
# apply fix with a `fix:` commit
# open PR to main; merge → semantic-release publishes patch → redeploy
```

### Rollback checklist

- [ ] Confirm network/contract IDs match the target environment after rollback.
- [ ] Re-run smoke tests on the restored deployment.
- [ ] Notify the team; monitor Sentry/LogRocket for the restored revision.

## Deployment checklist

- [ ] All CI checks pass on `main` (lint, typecheck, build, tests, coverage, E2E, performance, a11y)
- [ ] Env vars set per environment, contract IDs match the target network
- [ ] Monitoring (Sentry/LogRocket) initialized and reachable
- [ ] Staging verified before production promotion
- [ ] Security review completed before production merge (see `docs/SECURITY_BEST_PRACTICES.md` and `SECURITY.md`)

## Related

- [Release Process](../RELEASE.md)
- [Monitoring & Logging](MONITORING_AND_LOGGING.md)
- [Analytics](ANALYTICS.md)
- [Testing Strategy](TESTING_STRATEGY.md)
- [Security Best Practices](SECURITY_BEST_PRACTICES.md)
- [Environment Variables](../.env.example)
