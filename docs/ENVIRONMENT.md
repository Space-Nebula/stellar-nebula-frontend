# Environment Variables Reference

Complete guide to all environment variables supported by the Stellar Nebula frontend application.

## Overview

Because Stellar Nebula is a client-side Single Page Application (SPA) built with Vite, all environment variables prefixed with `VITE_` are statically replaced and baked into the client javascript bundle at build time.

> [!CAUTION]
> Never include private keys, secret seed phrases, or database credentials in any `VITE_*` variable. All values are exposed publicly in browser sources.

---

## Variable Reference Table

| Variable                   | Type    | Required / Optional     | Default Value                                              | Valid Values / Format                  | Description                                                                              |
| -------------------------- | ------- | ----------------------- | ---------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `VITE_APP_ENV`             | String  | **Required**            | `development`                                              | `development`, `staging`, `production` | Active runtime environment mode. Determines logging verbosity and error display details. |
| `VITE_APP_NAME`            | String  | Optional                | `Stellar Nebula`                                           | Any string                             | Human-readable application title shown in metadata and page headers.                     |
| `VITE_APP_VERSION`         | String  | Optional                | `0.0.0`                                                    | Semver string                          | Application release version used for cache busting and bug reports.                      |
| `VITE_STELLAR_NETWORK`     | String  | **Required**            | `testnet`                                                  | `testnet`, `futurenet`, `mainnet`      | Target Stellar network cluster for wallet connections and Horizon/RPC interaction.       |
| `VITE_STELLAR_RPC_URL`     | String  | **Required**            | `https://soroban-testnet.stellar.org`                      | Valid HTTPS URL                        | HTTP endpoint URL for Soroban RPC transactions and simulations.                          |
| `VITE_STELLAR_HORIZON_URL` | String  | **Required**            | `https://horizon-testnet.stellar.org`                      | Valid HTTPS URL                        | HTTP endpoint URL for classic Stellar Horizon account balances and payments.             |
| `VITE_STELLAR_PASSPHRASE`  | String  | **Required**            | `Test SDF Network ; September 2015`                        | String matching network                | Cryptographic network passphrase required for signing transactions and hashes.           |
| `VITE_NEBULA_CONTRACT_ID`  | String  | **Required** for scans  | `CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4` | Stellar contract `C...` address        | Soroban contract ID for procedural nebula generation and harvesting.                     |
| `VITE_TOKEN_CONTRACT_ID`   | String  | **Required** for tokens | `CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4` | Stellar contract `C...` address        | Soroban contract ID for the fungible or NFT resource token.                              |
| `VITE_API_BASE_URL`        | String  | **Required**            | `http://localhost:3000/api`                                | Valid HTTP/HTTPS URL                   | Base URL for the Nomad backend REST API.                                                 |
| `VITE_API_TIMEOUT_MS`      | Number  | Optional                | `10000`                                                    | Positive integer (ms)                  | Timeout limit for outbound HTTP requests before aborting.                                |
| `VITE_SENTRY_DSN`          | String  | Optional                | _(empty)_                                                  | Sentry DSN URL                         | Public ingestion DSN for Sentry exception tracking.                                      |
| `VITE_LOGROCKET_APP_ID`    | String  | Optional                | _(empty)_                                                  | `org/app` format                       | LogRocket application identifier for session recording.                                  |
| `VITE_ANALYTICS_ENDPOINT`  | String  | Optional                | _(empty)_                                                  | Valid HTTPS URL                        | Custom event telemetry collection endpoint.                                              |
| `VITE_ENABLE_MONITORING`   | Boolean | Optional                | `true`                                                     | `true`, `false`                        | Master toggle to enable or disable Sentry, LogRocket, and custom analytics.              |
| `VITE_LOG_LEVEL`           | String  | Optional                | `info`                                                     | `debug`, `info`, `warn`, `error`       | Minimum level of log messages emitted to browser console.                                |
| `VITE_ENABLE_DEV_TOOLS`    | Boolean | Optional                | `true` (dev) / `false` (prod)                              | `true`, `false`                        | Enables on-screen debug inspector panels.                                                |
| `VITE_ENABLE_FPS_COUNTER`  | Boolean | Optional                | `true` (dev) / `false` (prod)                              | `true`, `false`                        | Toggles WebGL FPS performance monitor overlay.                                           |

---

## Environment Setup Workflow

1. Copy `.env.example` to `.env.local` for personal local development overrides:
   ```bash
   cp .env.example .env.local
   ```
2. For staging deployments, refer to `.env.staging`.
3. For production deployments, inject the production variables described below.
