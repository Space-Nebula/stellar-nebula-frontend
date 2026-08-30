# Security Best Practices

Security guidance for developers working on the Nebula Nomad frontend. This complements the [Security Audit Checklist](../../SECURITY.md) and covers wallet security, XSS prevention, `localStorage` safety, API key / secret management, and Soroban contract risks.

## Core Principles

- The frontend is a **client-side** application; assume everything shipped to the browser is public.
- **Never** store or process private keys, seed phrases, or secret keys in the frontend.
- Wallet signing is delegated to trusted adapters (Freighter, Albedo) — never re-implement or intercept signing.
- Treat environment variables as configuration, not secrets. Anything prefixed with `VITE_` is embedded in the public bundle.

## Wallet Security

- Route all signing through `@/services/wallets` (`connectFreighter`, `connectAlbedo`, `signTransactionWith*`) and the `useFreighterWallet` hook.
- Only request the public key and signed XDR; never ask for a key grant/seed phrase.
- Display a clear, human-readable preview of what the user is signing; require an explicit user confirmation before submitting.
- Validate the transaction against the **active network** before submission. A transaction built for one network must not silently be submitted to another.
- On wallet errors, treat user cancellation (`W-1xx`, see `docs/ERROR_CODES.md`) as expected — do not retry.
- Never log `publicKey`/`XDR` payloads beyond what is necessary; redact if logged.
- Handle wallet absence gracefully: if Freighter is not installed, offer Albedo or prompt installation (`freighter.app`).

```ts
// Good: explicit, network-aware signing via the wallet adapter
const signedXdr = await signTransactionWithFreighter(unsignedXdr)
```

## XSS Prevention

- React **escapes text by default** — use `{value}` for text, never `dangerouslySetInnerHTML` unless the content is fully trusted and sanitized (there is currently no use case in this repo that justifies it).
- When rendering on-chain / user-provided strings (ship metadata, names, messages), treat them as untrusted data. Render as text, not HTML.
- Sanitize any URL before using it as an `href`/`src` or in a redirect:
  - Allow only `https:` / `http:` (and only where appropriate).
  - Reject `javascript:`, `data:` (except known-safe), and obfuscated schemes.
- Do not use `eval`/`new Function`. If dynamic evaluation is unavoidable, use a vetted sandbox.
- Keep dependency versions updated; run `npm audit` in CI and fix high/critical advisories.

```ts
// Good: build a safe URL
function safeHref(raw: string): string {
  const url = new URL(raw, window.location.origin)
  return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '#'
}
```

## localStorage Safety

- Use `StorageManager` (`src/utils/storage.ts`) with a namespace prefix (`stellar-nebula:`).
- **Do not** persist secrets, private keys, seed phrases, or raw signed transaction XDRs.
- Store only low-sensitivity UI/UX state (theme, network selection, analytics opt-out, cached resource snapshots, NFT metadata).
- Cache entries (ship NFT, resource snapshots) already include TTLs — respect and keep them short.
- Handle quota / privacy-mode failures gracefully. Reading and writing must be inside `try/catch` so the app still works when `localStorage` is unavailable (`S-601`, see `docs/ERROR_CODES.md`).
- Sanitize values before persisting and revalidate inputs read back from storage.

```ts
import { StorageManager } from '@/utils/storage'

const storage = new StorageManager({ prefix: 'stellar-nebula:' })
try {
  storage.setItem('theme', 'dark')
} catch {
  // fall back to in-memory state; never crash
}
```

## API Key Management

- All `VITE_*` env vars are bundled into the client and are **public** — never put secrets there.
- Server-side secrets (API keys, Soroban admin keys, decrypt keys) belong in backend/serverless code or the Soroban contract, never in the frontend bundle.
- Use the `.env.example` as the template; never commit real `.env`, `.env.local`, `.env.production`, or `.env.staging` files (they are gitignored).
- Rotate any key that is exposed; treat leaked client keys as compromised.
- Analytics / monitoring DSNs and App IDs (`VITE_SENTRY_DSN`, `VITE_LOGROCKET_APP_ID`) are public identifiers — they still should not appear in source diffs unnecessarily; load from env.

## Soroban Contract Risks

- Keep contract interactions behind the typed client (`SorobanContractClient`) and typed hooks (`useNebulaScan`, `useShipUpgrade`).
- **Validate inputs before building transactions** — never pass unsanitized user input (account IDs, ship IDs, amounts) directly into contract calls.
- Respect per-network contract IDs and pass the active network config explicitly; a transaction must target the current network's contract.
- Treat contract return values as untrusted data. Parse them with the `responseParser` utilities and guard against malformed payloads (`ContractResponseParseError`).
- Never hardcode secrets needed to authorize contract state changes on the client. Privileged operations belong server-side or in the contract.
- After a network switch, verify the wallet is disconnected/reconnected (`docs/DEPLOYMENT.md`, network switching docs) so a transaction isn't signed for the wrong network.

```ts
// Good: validate then build via the typed client
const params: ScanNebulaParams = {
  nebulaId: String(nebulaId).slice(0, 64),
  scannerPublicKey: publicKey,
}
const xdr = await client.buildScanTransaction(params)
```

## Dependency & Supply Chain

- Keep `package-lock.json` committed and up to date for deterministic installs.
- Run `npm audit` in CI; fail the build on high/critical vulnerabilities.
- Pin and review critical dependencies (`@stellar/stellar-sdk`, `@albedo-link/intent`, `freighter-api`).
- Review PRs that bump `react`, `vite`, build tooling, or wallet/SDK packages.

## Privacy

- Analytics intentionally strips PII — allow only event names/payloads that pass `sanitizeAnalyticsPayload`.
- Provide an analytics opt-out and respect it (see `src/services/analytics.ts`).
- Avoid collecting addresses, emails, keys, or personally identifiable data in logs, Sentry breadcrumbs, or analytics events.

## Release & Review Checklist

- [ ] `npm run lint` and `npm run format:check` pass
- [ ] `npm run build` (TypeScript) passes
- [ ] `npm test` and coverage thresholds pass
- [ ] `npm audit` reports no high/critical findings
- [ ] No `VITE_*` secrets, `.env*` files, or keys are committed
- [ ] New untrusted inputs are sanitized / rendered as text
- [ ] Wallet signing remains adapter-delegated and network-aware
- [ ] `STORAGE` additions respect the `stellar-nebula:` prefix and TTLs
- [ ] Security review completed before merge (see `SECURITY.md`)

See also: [Security Audit Checklist](../SECURITY.md), [Error Codes](ERROR_CODES.md), [Deployment Guide](DEPLOYMENT.md).
