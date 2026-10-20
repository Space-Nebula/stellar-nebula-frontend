# Security Audit Checklist

## Project Security Overview

Stellar Nebula is a frontend web application that integrates Stellar wallet signing and transaction submission flows. This review focuses on wallet security, transaction safety, dependency hygiene, and frontend attack surface reduction.

Key security principles applied:

- Frontend never stores or requests private keys or seed phrases.
- Wallet signing is delegated to trusted wallet adapters (Freighter and Albedo).
- Transaction submission is validated against network configuration and explicit wallet confirmation interfaces.
- Environment variables are treated as configuration values only; secrets are excluded from source control.

## Security Audit Checklist

- [x] Review wallet integration for unsafe permission and key handling.
- [x] Verify transaction signing is explicit and network-aware.
- [x] Validate wallet session persistence does not store secrets.
- [x] Review build and runtime dependency security posture.
- [x] Confirm environment variable usage is safe for frontend applications.
- [x] Review OWASP Top 10 risks for frontend-specific issues.
- [x] Document findings, vulnerabilities, and recommendations.

## Dependency Security Review

### Policy

- **Production dependencies** (anything that ships in the bundle) may never carry a
  known **high** or **critical** advisory. These cannot be allowlisted; the fix is an
  upgrade, a replacement, or removing the dependency.
- **Development / build-time dependencies** with a high or critical advisory must be
  fixed, or recorded in [`.audit-allowlist.json`](../.audit-allowlist.json) with a
  reason explaining why the advisory is not exploitable here, the date it was
  reviewed, and an **expiry date** (at most ~3 months out).
- **Moderate / low** advisories are reviewed when Dependabot opens a PR or during the
  regular dependency upgrade, and fixed when a non-breaking upgrade exists.

### How it is enforced

| Control                                                                                                                                                                                                                                                                             | Where                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| CI gate: `npm run audit:ci` (`scripts/audit-check.mjs`) fails on any unreviewed high/critical advisory, any high/critical advisory in production dependencies, and any allowlist entry that has **expired** or **no longer matches** an advisory (so stale exceptions get removed). | `dependency-scan` job in `.github/workflows/ci.yml` |
| The same scan runs **weekly on a schedule**, so a newly published advisory turns the job red even when no PRs are open.                                                                                                                                                             | `.github/workflows/ci.yml` (`schedule`)             |
| Dependabot opens grouped version-update PRs daily (npm) and weekly (GitHub Actions); security-update PRs are grouped separately.                                                                                                                                                    | `.github/dependabot.yml`                            |
| Dependabot alerts and security updates must be enabled for the repository (Settings → Code security → Dependabot alerts / Dependabot security updates).                                                                                                                             | Repository settings                                 |

### Running it locally

```bash
npm run audit:ci                  # the CI gate
npm audit --omit=dev              # production dependencies only
npm audit fix                     # apply non-breaking fixes
```

### Automated scanning (#482)

- `.github/workflows/security-audit.yml` runs `npm run audit:ci` every week and on demand.
- `.github/workflows/dependabot-auto-merge.yml` enables auto-merge for Dependabot **minor and patch**
  updates. Auto-merge waits for the required checks to pass. Major updates and security updates
  still need a human review. The repository must have "Allow auto-merge" turned on.

### Adding an exception

Only for development/build-time dependencies, and only when no fixed version can be
adopted yet. Add an entry to `.audit-allowlist.json`:

```json
{
  "id": "GHSA-xxxx-xxxx-xxxx",
  "package": "affected-package",
  "severity": "high",
  "paths": ["direct-dep > affected-package"],
  "scope": "development (build-time only)",
  "reason": "Why it is not exploitable in this project, and what the real fix is.",
  "reviewed": "YYYY-MM-DD",
  "expires": "YYYY-MM-DD"
}
```

The PR adding it needs a reviewer's sign-off. When the entry expires, CI fails until it
is re-reviewed (new expiry) or the dependency is fixed.

### Current status (2026-10-18)

`npm audit` reported 57 advisories (5 critical, 34 high). After this review:

- **0 critical, 0 high in production dependencies.**
- Resolved by upgrade: `@stellar/stellar-sdk` 15 → 17 (bundled `axios` prototype-pollution
  and `toml` advisories), `vitest` / `@vitest/*` → 4.1.12, `@faker-js/faker` 9 → 10, plus
  the transitive fixes applied by `npm audit fix` (`postcss`, `proxy-addr`,
  `browserslist`, `fast-uri`, `form-data`, `js-yaml`, `compression`, …).
- Removed: `@size-limit/preset-app` (its headless-Chrome timing was unused — every
  `.size-limit.json` budget sets `"running": false`; `@size-limit/file` covers size
  budgets) and `@lhci/cli` as a devDependency (its `puppeteer`/proxy chain has no
  fixed release; the performance job now runs a pinned `npx @lhci/cli@0.15.1`, so it is
  no longer installed for every developer and CI job).
- `@storybook/addon-essentials@8` removed: it is built into Storybook 10 and its
  Storybook 8 peer requirement broke `npm ci`.
- **One allowlisted advisory:** `braces` GHSA-vfj7-8cjw-p6xm (high), reached only through
  Tailwind CSS 3 at build time. See the entry in `.audit-allowlist.json`; the fix is the
  Tailwind CSS 4 migration (expires 2027-01-31).
- **Follow-ups (moderate):** `react-router-dom` 6 → 7 for GHSA-wrjc-x8rr-h8h6 (open
  redirect via backslash in `<Link>`/`useNavigate`) and GHSA-337j-9hxr-rhxg — a major
  upgrade tracked separately.

### Dependency families to watch

- `@stellar/stellar-sdk`, `@albedo-link/intent`, `@walletconnect/*`, `@ledgerhq/*` —
  they handle signing and transaction data.
- `react`, `react-dom`, `react-router-dom`.
- Build tooling: `vite`, `typescript`, `eslint`, `tailwindcss`.

## Wallet Security Review

### Findings

- Wallet adapters use Freighter and Albedo only; the frontend does not generate or store private keys.
- No code requests seed phrases or raw private keys from users.
- Wallet session persistence stores only:
  - public key
  - wallet type
  - network
- The wallet session validator has been improved to verify both public key and actual wallet network before restoring a session.
- Transaction signing flows are delegated to the wallet adapter and require explicit user approval in the wallet UI.

### Improvements made

- Added stronger wallet session validation for Freighter.
- Updated reconnect logic to restore state only when the wallet remains connected and the public key is unchanged.
- Added storage synchronization for wallet network state.
- Added network mismatch protection in trustline transaction flows.
- Added a duplicate transaction submission guard in `useSignTransaction`.

### Wallet risks reviewed

- Unsafe wallet permissions: none were detected in frontend code.
- Seed phrase handling: not present.
- Private key handling: not present.
- Unsafe transaction signing: signing is proxied through wallet adapters.
- Missing network validation: improved in reconnect and trustline flows.
- Missing transaction confirmation UI: trustline confirmation is explicit via modal flow.
- Wallet session persistence issues: wallet session storage now avoids secrets and validates session state.
- Insecure RPC usage: all RPC endpoints are configured through environment variables and expected to use HTTPS.
- Blind signing risks: all transactions are prepared and passed as XDR to wallets, and the wallet UI is responsible for signing confirmation.

## Transaction Safety Review

### Findings

- Transaction submission now guards against duplicate sign/submit operations.
- Ship upgrade execution flow now accepts both `SUCCESS` and `PENDING` submission statuses and handles on-chain polling correctly.
- Trustline flows now validate wallet network alignment before preparing a transaction.
- The app uses explicit wallet confirmation flows for signing operations.

### Improvements made

- Prevented re-entry of `signAndSubmit` while a submission is in progress.
- Improved upgrade transaction error handling for `SUCCESS`, `PENDING`, and failure statuses.
- Enforced network validation before trustline transaction preparation.
- Preserved user-facing confirmation and error feedback in transaction flows.

### Transaction safety gaps to monitor

- Ensure duplicate submission is also prevented at the UI trigger level, especially when buttons are clicked repeatedly.
- Keep optimistic UI states consistent with actual on-chain results and clearly communicate pending/failed transaction state.
- Verify that any future transaction builder code includes output validation for amount, recipient, and asset details.

## OWASP Top 10 Review

### Broken Access Control

- Frontend access control is limited to wallet connection state; sensitive operations are gated by wallet sign requests.
- Backend access control is not in scope for this frontend-only review.

### Cryptographic Failures

- All signing is delegated to external wallets.
- Private keys and secrets are not stored in the application.

### Injection

- User inputs used to build Stellar operations are validated (`assetCode`, `issuer`).
- Transaction generation is performed through the official Stellar SDK.

### Insecure Design

- No CSP is currently enforced by the frontend; this should be added at the hosting layer.
- The app relies on environment-configured RPC/Horizon endpoints; these must be validated in deployment.

### Security Misconfiguration

- The environment loader validates required variables.
- `.env*` files are now ignored by source control.

### Vulnerable Components

- Enforced in CI by `npm run audit:ci`; see [Dependency Security Review](#dependency-security-review).

### Authentication Failures

- Wallet-based authentication is used; there is no password storage in the frontend.
- Connection state is validated before sensitive actions.

### Integrity Failures

- No code integrity mechanism is present in the frontend bundle.
- Recommended: add runtime integrity checks or signed deployments on the hosting platform.

### Logging Failures

- No sensitive wallet or private data is written to logs in the reviewed code.

### SSRF Risks

- RPC and Horizon URLs are externally configurable, so only trusted HTTPS endpoints should be used in deployment.

## Subresource Integrity (SRI)

External CDN scripts (currently LogRocket) are loaded with a `sha384` integrity hash and `crossorigin="anonymous"` so a compromised CDN cannot serve altered code.

- `npm run sri:generate` fetches each CDN resource and prints its hash.
- `npm run sri:update` writes the hashes into `index.html` and `src/utils/sri.ts`.
- `npm run sri:check` verifies the committed hashes and runs in the `build` job of `ci.yml`.

When a CDN resource changes upstream, run `npm run sri:update` and commit the result. To add a resource, add it to `CDN_RESOURCES` in `scripts/generate-sri.mjs` and `SRI_RESOURCES` in `src/utils/sri.ts`.

### Refresh automation

`.github/workflows/sri-update.yml` runs `node scripts/generate-sri.mjs --update` every week. If a
hash changed, it opens a `security/sri-refresh-*` PR for review. `vite build` also fails when the
pinned hash does not match the live file, so an unreviewed upstream change cannot ship. Set
`SKIP_SRI_CHECK=1` only for offline builds.

## Sentry DSN Exposure (#484)

The Sentry DSN in `VITE_SENTRY_DSN` is public and is accepted as exposed. It is embedded in the
client bundle by design, and it only allows sending events to the project. It is not a secret.
Protection comes from Sentry rate limits, allowed domains, data scrubbing, and redaction in
`src/services/monitoring.ts`. The full checklist is in [MONITORING.md](./MONITORING.md#sentry-dsn-exposure-484).

## Client-Side Rate Limiting (#483)

Frontend requests to Horizon and contract endpoints are rate limited with a token bucket, so a
loop or a busy tab cannot flood the endpoints. The limits, usage and limitations are in
[API_LIMITS.md](./API_LIMITS.md). This is a cost and courtesy guard, not a security boundary.

## Environment Variable Security

- Environment variables are loaded through Vite and validated at runtime.
- The project keeps `VITE_*` configuration variables in source control, but sensitive values should be provided via CI/CD secrets.
- `.env`, `.env.local`, `.env.*` are now ignored by git.
- No secrets were found committed in reviewed environment files.
- The following values are safe to expose in frontend config only when they are not secret:
  - network endpoints
  - contract IDs
  - public API base URLs

## HTTPS Enforcement

HTTPS is enforced at the production deployment layer:

- **Vercel redirects** all HTTP requests to HTTPS automatically.
- **HSTS header** (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`) is set in `vercel.json` to enforce browser-level HTTPS enforcement for one year.
- **Dev environment** should use HTTPS during local development by configuring the Vite dev server.
- **Mixed content warnings** are prevented by ensuring all external resources use HTTPS URLs.

## Sensitive Data Protection

User and session data stored in localStorage includes sensitive information (wallet addresses, authentication tokens). This data is protected through encryption:

- **Encryption utilities** in `src/utils/crypto.ts` provide AES-256-GCM encryption with PBKDF2 key derivation.
- **Storage service** in `src/services/storage.ts` handles encrypted/decrypted access to sensitive localStorage entries.
- **Encryption key** is derived from a session-specific password and stored in sessionStorage.
- **Backward compatibility** is maintained by gracefully handling unencrypted legacy data.
- **Helper functions** `encryptSensitiveSlices()` and `decryptSensitiveSlices()` in `src/services/saveLoad.ts` allow manual encryption of game save data.
- **Monitoring redaction** keeps wallet addresses, secrets and amounts out of Sentry and LogRocket (`src/utils/sanitization.ts`, see [PRIVACY.md](./PRIVACY.md)).

## Content Security Policy

A strict Content Security Policy is enforced via both Vercel headers and HTML meta tag:

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.logrocket.io https://*.stellar.org
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com data:
img-src 'self' data: blob: https:
connect-src 'self' https://*.stellar.org wss://*.stellar.org https://*.sentry.io https://*.logrocket.io http://localhost:* ws://localhost:* wss://*
worker-src 'self' blob:
object-src 'none'
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

This policy:

- Prevents XSS attacks by restricting script execution sources.
- Blocks unauthorized framing (`frame-ancestors 'none'`).
- Restricts form submissions to same-origin (`form-action 'self'`).
- Allows external connections only to Stellar network endpoints and monitoring services.
- Denies object embedding entirely.

## Clickjacking Protection (#487)

The app must not be embeddable in another site's frame, which would allow clickjacking attacks.

- **`X-Frame-Options: DENY`** is set in `vercel.json`, `nginx.conf`, and the dev and preview servers in `vite.config.ts`.
- **`Content-Security-Policy: frame-ancestors 'none'`** is set as a response header in the same places. The `frame-ancestors` directive is the modern control. `X-Frame-Options` covers older browsers.
- `frame-ancestors` is **ignored in a `<meta>` tag**, so `index.html` does not carry it. The header is the enforcement point.
- `.github/workflows/security-headers.yml` checks these headers in CI and, when a URL is set, against the deployed site.

## Security Headers (#489)

Every response, including SPA routes, sends the following headers:

| Header | Value | Purpose |
| :--- | :--- | :--- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | HTTPS only (`vercel.json`) |
| `X-Content-Type-Options` | `nosniff` | Stops MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits the referrer sent to other sites |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()` | Disables device APIs the app does not use |
| `X-XSS-Protection` | `0` | Turns off the legacy browser XSS auditor, which can introduce vulnerabilities. CSP is the XSS control. |
| `X-Frame-Options` | `DENY` | See Clickjacking Protection |
| `Content-Security-Policy` | See Content Security Policy below | XSS and framing protection |

Notes:

- `nginx.conf` must repeat `add_header` in every location that sets its own `add_header`. Otherwise
  nginx drops the server-level headers. The `/` and `/assets/` locations do this.
- The `X-XSS-Protection` value is `0` on purpose. Setting `1; mode=block` is no longer recommended.

## CORS and Horizon Access (#488)

- The app contacts only the Stellar Horizon hosts listed in `src/config/horizon.ts`:
  `horizon-testnet.stellar.org`, `horizon-futurenet.stellar.org` and `horizon.stellar.org`. A local
  `localhost` Quickstart node is allowed in development only.
- `createHorizonServer()` refuses any other host before a request is made.
- Horizon serves public ledger data, so Horizon requests carry **no credentials**. The raw `fetch`
  in `src/services/nft/shipNFT.ts` uses `credentials: 'omit'`, and the SDK clients send no
  authentication headers.
- CORS headers are set by the Horizon server. This app does not require `Access-Control-Allow-Credentials`.
- Full details are in [API_INTEGRATION.md](./API_INTEGRATION.md).

## Recommendations

- Migrate to Tailwind CSS 4 to retire the `braces` allowlist entry.
- Upgrade `react-router-dom` to v7 for the moderate open-redirect advisories.
- Add runtime secure RPC validation to reject non-HTTPS endpoints.
- Implement wallet phishing detection guidance in UI messaging.
- Use transaction simulation wherever possible before signing.
- Add rate limiting and abuse protection for backend endpoints connected to wallet flows.
- Consider bundle integrity and signed deploys for production releases.

## Audit Status

- `SECURITY.md` has been created with a project-specific review.
- Code-level wallet and transaction safety improvements were implemented.
- `.gitignore` now excludes environment files.
- HTTPS enforcement implemented via Vercel headers and HSTS configuration (2026-10-19).
- Content Security Policy enforced at hosting layer and in HTML meta tag (2026-10-19).
- Sensitive data encryption utilities and storage service created (2026-10-19).
- Multi-signature transaction support added with full documentation (2026-10-19).
- LogRocket and Sentry redact wallet addresses, secrets and amounts before data leaves the app; see [PRIVACY.md](./PRIVACY.md) and [MONITORING.md](./MONITORING.md#privacy-controls-logrocket--sentry-486) (#486).
- Clickjacking protection via `X-Frame-Options` and `frame-ancestors` headers (#487).
- Horizon host allow-list and credential-free requests; see [API_INTEGRATION.md](./API_INTEGRATION.md) (#488).
- Security headers applied to Vercel, nginx (including SPA routes) and the dev and preview servers, verified by `security-headers.yml` (#489).
- `npm audit` was run on 2026-10-18; high/critical findings were resolved or reviewed as described in
  [Dependency Security Review](#dependency-security-review), and the CI gate now enforces the policy.
