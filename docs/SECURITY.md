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

### Audit status

The package dependency manifest and lockfile were inspected, and the following security controls were applied:

- `package-lock.json` is present and can be used for deterministic audits.
- `.gitignore` was updated to ignore `.env` and `.env.*` files while preserving `.env.example`.

### Audit execution note

A direct `npm audit` execution attempt could not be completed in the current workspace environment because shell access was unavailable for audit commands.

Recommended commands:

```bash
npm audit
npm audit fix
```

### Findings & recommendations

- No high/critical findings were obtained from an automated audit in this environment.
- The following dependency families should be monitored closely for vulnerabilities:
  - `@stellar/stellar-sdk`
  - `@albedo-link/intent`
  - `react`, `react-dom`, `react-router-dom`
  - `vite`, `typescript`, `eslint`, `tailwindcss`
- Enable automated dependency scanning using Dependabot, Renovate, or GitHub security alerts.
- Run `npm audit` in CI or a local environment and fix any high/critical vulnerabilities immediately.

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

- Dependency audit could not be executed here, so component vulnerabilities remain unverified until `npm audit` can run.
- Recommended: enable automated dependency scanning.

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

## Environment Variable Security

- Environment variables are loaded through Vite and validated at runtime.
- The project keeps `VITE_*` configuration variables in source control, but sensitive values should be provided via CI/CD secrets.
- `.env`, `.env.local`, `.env.*` are now ignored by git.
- No secrets were found committed in reviewed environment files.
- The following values are safe to expose in frontend config only when they are not secret:
  - network endpoints
  - contract IDs
  - public API base URLs

## Recommendations

- Add a Content Security Policy (CSP) at the hosting layer.
- Enable Dependabot or Renovate for automated dependency upgrades.
- Add a CI step to run `npm audit` and fail on high/critical vulnerabilities.
- Add runtime secure RPC validation to reject non-HTTPS endpoints.
- Implement wallet phishing detection guidance in UI messaging.
- Use transaction simulation wherever possible before signing.
- Add rate limiting and abuse protection for backend endpoints connected to wallet flows.
- Consider bundle integrity and signed deploys for production releases.

## Audit Status

- `SECURITY.md` has been created with a project-specific review.
- Code-level wallet and transaction safety improvements were implemented.
- `.gitignore` now excludes environment files.
- `npm audit` was not executed in this workspace due shell access restrictions in the current environment.
- Recommended next step: run `npm audit` and `npm audit fix` in a local/CI environment, then review any high/critical issues.
