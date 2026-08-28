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

Copy `.env.example` to `.env.local` for local development. Reference `.env.staging` and `.env.production` as templates for those environments.

Critical variables (see `.env.example` for the full list):

| Variable                   | Purpose                                  | Example                                          |
| -------------------------- | ---------------------------------------- | ------------------------------------------------ |
| `VITE_APP_ENV`             | `development` / `staging` / `production` | `production`                                     |
| `VITE_STELLAR_NETWORK`     | `testnet` / `futurenet` / `mainnet`      | `mainnet`                                        |
| `VITE_STELLAR_RPC_URL`     | Soroban RPC endpoint                     | `https://soroban-rpc.stellar.org`                |
| `VITE_STELLAR_HORIZON_URL` | Horizon endpoint                         | `https://horizon.stellar.org`                    |
| `VITE_STELLAR_PASSPHRASE`  | Network passphrase for signing           | `Public Global Stellar Network ; September 2015` |
| `VITE_NEBULA_CONTRACT_ID`  | Nebula Soroban contract `C…` id          | (secret, set at deploy)                          |
| `VITE_TOKEN_CONTRACT_ID`   | Token Soroban contract `C…` id           | (secret, set at deploy)                          |
| `VITE_API_BASE_URL`        | Backend/API base URL                     | `https://api.stellarnebula.io/api`               |
| `VITE_SENTRY_DSN`          | Sentry error-tracking DSN                | (secret, set at deploy)                          |
| `VITE_LOGROCKET_APP_ID`    | LogRocket App ID                         | (secret, set at deploy)                          |
| `VITE_ENABLE_MONITORING`   | Enable monitoring                        | `true`                                           |
| `VITE_LOG_LEVEL`           | `debug` / `info` / `warn` / `error`      | `warn` (production)                              |

> **Security:** all `VITE_*` values are public once built. Contract IDs and DSNs are identifiers, not secrets, but they should still be injected at deploy time via your platform's env/secrets mechanism rather than committed. Contract state-authorization keys must never live in the frontend.

Verify env files are **not** committed (they are gitignored; only `.env.example` is tracked).

## Build

```bash
npm ci
npm run build   # runs tsc -b && vite build, outputs dist/
npm run preview # optional: serve the built output locally
```

## Deployment Targets

### Docker

Two Dockerfiles are provided.

**Development**

```bash
docker-compose up dev # serves Vite dev server on :5173
```

**Production** (Dockerfile.prod is a multi-stage build → Nginx serving `dist/`)

```bash
docker-compose up prod # builds and serves on :8080
```

Environment variables are passed to the container at build/runtime via `docker-compose.yml` (e.g. `VITE_STELLAR_NETWORK=FUTURENET`). For a custom deployment:

```bash
docker build -f Dockerfile.prod -t nebula-nomad:latest .
docker run --rm -p 8080:80 -e VITE_STELLAR_NETWORK=mainnet nebula-nomad:latest
```

Nginx default config serves `dist/`; add a custom `nginx.conf` mapping unknown routes to `index.html` for SPA routing if you replace the default config.

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
