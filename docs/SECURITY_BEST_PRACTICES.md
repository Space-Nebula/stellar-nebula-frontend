# Security Best Practices

This document defines the security practices for the Stellar Nebula frontend. The frontend prepares transactions and delegates signing to supported wallets; it must never act as a key store.

## Wallet Integration

- Never request, accept, store, or log seed phrases, secret keys, private keys, or wallet export data.
- Use the supported Freighter and Albedo adapters for connection and signing.
- Display the connected public key and network so users can verify the active account before a sensitive action.
- Treat wallet approval as a user decision. Do not hide, alter, or silently submit transaction details.
- Validate the wallet network and public key before restoring a persisted session or preparing a transaction.
- Persist only non-secret session metadata: public key, wallet type, and network.
- Clear persisted wallet metadata on disconnect, session invalidation, or account mismatch.

## Transaction Safety

- Build transactions with the configured Stellar network passphrase and trusted contract or asset identifiers.
- Validate recipient, asset, issuer, amount, fee, timeout, and contract parameters before signing.
- Simulate contract transactions where supported and review resource requirements before requesting approval.
- Prevent duplicate sign and submit operations at both the hook and UI action levels.
- Treat `PENDING` and timeout states as indeterminate until the transaction is checked by hash.
- Do not automatically retry user cancellations, invalid transactions, or confirmed on-chain failures.
- Retry only transient network, timeout, HTTP 429, and HTTP 5xx failures with bounded exponential backoff.
- Never assume a successful wallet signature means that the network accepted the transaction.

## Configuration and Deployment

- Treat all `VITE_*` values as public browser configuration. Never place secrets in them.
- Use HTTPS for RPC, Horizon, API, analytics, and monitoring endpoints in production.
- Keep `.env`, `.env.local`, and other environment-specific files out of source control; commit only safe example values.
- Pin and audit dependencies through the lockfile and CI. Investigate high and critical findings before release.
- Configure a Content Security Policy and secure response headers at the hosting layer.
- Use protected deployment environments, signed releases, and source maps restricted to monitoring systems where possible.

## Logging, Monitoring, and Privacy

- Use scoped structured logging and stable error codes rather than ad hoc sensitive messages.
- Never log secret keys, seed phrases, signed XDR, authentication tokens, or full wallet identifiers.
- Sanitize analytics and monitoring payloads before transmission. Public keys are still user-linked data and should be minimized.
- Include network, operation, wallet type, error code, and transaction hash only when needed for diagnosis.
- Keep session replay masking and media blocking enabled for wallet and transaction interfaces.
- Provide a way to clear monitoring user context on disconnect or logout.

## Frontend Attack Surface

- Render user-controlled values as text and avoid unsafe HTML injection.
- Validate external URLs and allow only trusted HTTPS endpoints for configurable services.
- Do not trust client-side wallet state as backend authorization. Any backend service must verify signatures and enforce access control independently.
- Rate-limit and authenticate backend endpoints associated with wallet actions.
- Review third-party scripts, wallet providers, and dependency updates before enabling them in production.

## Release Checklist

- [ ] No secrets or private key material are present in source, logs, bundles, or environment files.
- [ ] Wallet network and account validation are covered by tests.
- [ ] Transaction confirmation, pending, failure, and duplicate-submit states are handled.
- [ ] Production RPC and API endpoints use HTTPS and trusted hosts.
- [ ] Dependency audit and build checks pass.
- [ ] Monitoring and analytics payloads are sanitized.
- [ ] Security headers and CSP are configured by the hosting platform.

See [SECURITY.md](../SECURITY.md) for the project security audit and outstanding recommendations.
