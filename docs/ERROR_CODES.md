# Error Codes & Reference

This reference documents the error conditions surfaced by the Nebula Nomad frontend, including their causes, resolution steps, and monitoring tags. Use it to speed up debugging and to add Sentry tags / breadcrumbs consistently.

## Error Taxonomy

Frontend errors fall into broad categories. Every category has a stable **monitoring tag** (Sentry tag name) so failures can be grouped and alerted on.

| Category           | Monitoring Tag (`tag:`)      | Where raised                                                |
| ------------------ | ---------------------------- | ----------------------------------------------------------- |
| Wallet             | `error.category:wallet`      | `useFreighterWallet`, `useSignTransaction`, wallet services |
| Transaction        | `error.category:transaction` | `useSignTransaction`, `useShipUpgrade`                      |
| Contract (Soroban) | `error.category:contract`    | `SorobanContractClient`, `useNebulaScan`, ship upgrade      |
| Network / RPC      | `error.category:network`     | API client, retry helper, RPC calls                         |
| Parsing            | `error.category:parsing`     | `responseParser` utilities                                  |
| Rendering / 3D     | `error.category:rendering`   | Three.js scene, `ErrorBoundary`                             |
| Storage            | `error.category:storage`     | `StorageManager`, `useLocalStorage`                         |
| API                | `error.category:api`         | `src/services/api.ts`                                       |

## Error Classes

These are the explicit `Error` subclasses exported by the codebase. Handle and tag them first.

### `ContractError`

Extends `Error`. Thrown by `SorobanContractClient` (`src/services/contracts/soroban.ts`) and by contract hooks when a Soroban transaction cannot be built, submitted, confirmed, or decoded.

```ts
import { ContractError } from '@/services/contracts'

catch (err) {
  if (err instanceof ContractError) {
    Sentry.setTag('error.category', 'contract')
    Sentry.captureException(err)
  }
}
```

**Monitoring tag:** `error.category:contract`

---

### `ContractResponseParseError`

Extends `Error`. Thrown by `src/utils/stellar/responseParser.ts` when a contract return value XDR cannot be parsed.

**Monitoring tag:** `error.category:parsing`

---

## Error Code Table

Numbered codes for log querying and alert routing. Prefix codes with the category.

### Wallet Errors (prefix `W-`)

| Code    | Message / Condition                      | Cause                                               | Resolution                                                              | Monitoring tag                              |
| ------- | ---------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| `W-100` | `Freighter wallet is not installed...`   | Freighter extension missing                         | Guide user to install Freighter at `freighter.app`, or switch to Albedo | `error.category:wallet`, `error.code:W-100` |
| `W-101` | `Transaction signing was cancelled...`   | User dismissed/rejected the wallet signature prompt | Non-blocking; do not retry automatically                                | `error.category:wallet`, `error.code:W-101` |
| `W-102` | Wallet connection rejected / unavailable | Permissions declined or wallet locked               | Ask user to approve and unlock wallet                                   | `error.category:wallet`                     |
| `W-103` | Albedo not available                     | Albedo intent invocation unavailable in environment | Fall back to Freighter                                                  | `error.category:wallet`                     |

### Transaction Errors (prefix `T-`)

| Code    | Message / Condition                                                | Cause                                     | Resolution                                        | Monitoring tag                                         |
| ------- | ------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `T-200` | `Transaction signing was cancelled or rejected by the wallet.`     | Wallet sign prompt rejected by user       | No retry; surface message to user                 | `error.category:transaction`, `error.code:T-200`       |
| `T-201` | `Unexpected transaction submission status: <status>`               | RPC returned unknown send status          | Inspect `sendStatus`, validate network/RPC config | `error.category:transaction`                           |
| `T-202` | `Transaction submission did not return a transaction hash.`        | RPC `sendTransaction` returned no hash    | Retry submission; verify RPC availability         | `error.category:transaction`                           |
| `T-203` | `Transaction was submitted but could not be found on the network.` | Transaction not yet indexed / omitted     | Poll again after ledger close                     | `error.category:transaction`                           |
| `T-204` | `Network error while polling transaction status.`                  | Timeout/connection during status polling  | Retry polling with backoff (`retryAsync`)         | `error.category:network`, `error.category:transaction` |
| `T-205` | `The upgrade transaction failed on-chain.`                         | On-chain assertion failure during upgrade | Review contract state and resources               | `error.category:contract`                              |
| `T-206` | `Upgrade submission failed: <status>`                              | Send status `FAILED`/`ERROR`              | Check fee, sequence number, contract state        | `error.category:transaction`                           |
| `T-207` | `Connect a wallet to submit the upgrade transaction.`              | No connected wallet                       | Prompt to connect a wallet first                  | `error.category:wallet`                                |

### Contract Errors (prefix `C-`)

| Code    | Message / Condition                       | Cause                                              | Resolution                                  | Monitoring tag                                      |
| ------- | ----------------------------------------- | -------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `C-300` | `Transaction submission failed: <errXdr>` | RPC rejected the submitted transaction             | Decode `errXdr`; check auth, fee, resources | `error.category:contract`, `error.code:C-300`       |
| `C-301` | `Transaction failed on-chain`             | Contract execution reverted                        | Inspect contract events/logs                | `error.category:contract`                           |
| `C-302` | `Transaction confirmation timed out`      | Contract didn't confirm within `MAX_POLL_ATTEMPTS` | Retry; check network congestion             | `error.category:contract`, `error.category:network` |
| `C-303` | `Contract returned no value`              | Contract call returned `null`/no return value      | Verify contract function and args           | `error.category:contract`                           |
| `C-304` | `Unable to decode contract return value`  | Return value XDR malformed/unsupported             | Validate contract ABI / SDK version         | `error.category:contract`, `error.category:parsing` |

### Parsing Errors (prefix `P-`)

| Code    | Message / Condition                              | Cause                      | Resolution                                 | Monitoring tag           |
| ------- | ------------------------------------------------ | -------------------------- | ------------------------------------------ | ------------------------ |
| `P-400` | `Empty contract response XDR payload.`           | Empty XDR passed to parser | Guard against empty response               | `error.category:parsing` |
| `P-401` | `Unsupported contract response payload.`         | Unrecognized XDR shape     | Check SDK / contract version compatibility | `error.category:parsing` |
| `P-402` | Generic `Unable to parse contract response XDR.` | Malformed XDR string       | Validate source of XDR                     | `error.category:parsing` |

### Network / RPC Errors (prefix `N-`)

| Code    | Message / Condition                                                 | Cause                          | Resolution                                      | Monitoring tag           |
| ------- | ------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- | ------------------------ |
| `N-500` | `Failed to fetch ship metadata (<status>)`                          | Horizon/RPC returned non-2xx   | Check URL config and account existence          | `error.category:network` |
| `N-501` | `Failed to fetch ship account (<status>)`                           | Account not found or RPC error | Verify public key / network                     | `error.category:network` |
| `N-502` | Retryable network errors (timeout, `503`, `502`, `429`, ECONNRESET) | Transient RPC/network failures | Left to `retryAsync` with backoff; then surface | `error.category:network` |

### Storage Errors (prefix `S-`)

| Code    | Message / Condition                         | Cause                                         | Resolution                              | Monitoring tag           |
| ------- | ------------------------------------------- | --------------------------------------------- | --------------------------------------- | ------------------------ |
| `S-600` | `encrypted value but no key provided`       | Encrypted value read without a decryption key | Provide/derive the storage key          | `error.category:storage` |
| `S-601` | `localStorage` unavailable / quota exceeded | Private browsing or quota                     | Gracefully fall back to in-memory state | `error.category:storage` |

---

## Monitoring & Alerting

When any of the above errors is caught, attach the relevant tags and a breadcrumb before capturing:

```ts
import * as Sentry from '@sentry/react'
import { logger } from '@/services/logging'

try {
  // risky operation
} catch (err) {
  Sentry.addBreadcrumb({ category: 'contract', message: 'client.submitScanTransaction failed' })
  Sentry.setTag('error.category', 'contract')
  Sentry.setTag('error.code', err instanceof ContractError ? 'C-301' : 'unknown')
  Sentry.captureException(err)

  logger.error(
    'submitScanTransaction failed',
    err instanceof Error ? err : new Error(String(err)),
    {
      category: 'contract',
    }
  )
}
```

### Recommended Alerts

- **High priority:** any `T-2xx`/`C-3xx` code appearing repeatedly (on-chain failures are user-impacting).
- **Medium priority:** `N-5xx` network/RPC degradation spikes.
- **Low priority (no paging):** `W-1xx` user-cancellation codes — these are expected user actions and should only be counted, not alerted.

### Querying

Use the tags above in Sentry / your error dashboard:

```
error.category:contract
error.code:C-301

severity:error
```

Always include a stable `error.code` tag when possible so dashboards can group by code rather than free-text messages.

---

## Adding a New Error

1. Assign a code in the correct prefix range (`W-`, `T-`, `C-`, `P-`, `N-`, `S-`).
2. Throwing a new `Error` subclass? Document it under [Error Classes](#error-classes).
3. When caught, set `error.category` and `error.code` tags (see [Monitoring & Alerting](#monitoring--alerting)).
4. Add a row to the corresponding table so support can look it up.
