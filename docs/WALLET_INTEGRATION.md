# Wallet Integration

Supported adapters: **Freighter** (extension), **xBull** (extension), **Albedo**
(web popup), **WalletConnect** (mobile), and **Ledger** (hardware). This
document covers how each adapter talks to the app, the error scenarios they
share, and how to test them.

## Adapters at a glance

| Wallet        | Module                                  | Transport                             | Availability check                                   |
| ------------- | --------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Freighter     | `src/services/wallets/freighter.ts`     | `window.freighter` extension API      | `isFreighterInstalled()`                             |
| xBull         | `src/services/wallets/xbull.ts`         | `window.xBull` extension API          | `isXBullInstalled()`                                 |
| Albedo        | `src/services/wallets/albedo.ts`        | `albedo.link` popup + `postMessage`   | `isAlbedoAvailable()` (any browser)                  |
| WalletConnect | `src/services/wallets/walletconnect.ts` | WalletConnect v2 relay + QR/deep link | `isWalletConnectAvailable()` (project ID configured) |
| Ledger        | `src/services/wallets/ledger.ts`        | WebUSB device transport               | `isLedgerAvailable()` (WebUSB)                       |

All adapters are orchestrated by `WalletContext`; the connect modal renders the
availability badges and error alerts.

## Error Scenarios

This document describes how wallet connection failures are classified, what the
user sees, and how they recover. All classification lives in
`src/services/wallets/errorHandling.ts` and is applied by
`WalletContext.connect()` via `handleWalletConnectionError()` +
`formatWalletError()`; the rendered message (message + recovery hint) appears in
the connect modal (`src/components/Wallet/ConnectModal.tsx`) and is logged with
its error code for debugging.

### How errors surface

- **UI**: the connect modal shows `role="alert"` with the formatted message
  (specific message + recovery instructions).
- **Logging**: `WalletContext` logs the failure with `errorCode` via the app
  logger and reports an `error_reported` analytics event.
- **Network mismatch**: detected separately by `validateNetworkMatch()` in
  `src/services/wallets/networkValidation.ts`; shown as a blocking error when
  signing and as `networkMismatchWarning` after connecting.

### Error scenarios

| Code                               | Scenario                          | User message                                       | Recovery                                           |
| ---------------------------------- | --------------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `FREIGHTER_NOT_INSTALLED`          | Freighter extension missing       | Freighter wallet is not installed                  | Install from https://www.freighter.app             |
| `XBULL_NOT_INSTALLED`              | xBull extension missing           | xBull wallet is not installed                      | Install from https://xbull.app                     |
| `ALBEDO_NOT_AVAILABLE`             | Albedo popup unavailable          | Albedo is not available in this browser            | Use a popup-capable browser                        |
| `LEDGER_WEBUSB_UNSUPPORTED`        | Browser lacks WebUSB              | Ledger WebUSB is not supported in this browser     | Use Chrome or Edge                                 |
| `WALLETCONNECT_PROJECT_ID_MISSING` | Missing env config                | WalletConnect project ID is not configured         | Set `VITE_WALLETCONNECT_PROJECT_ID`                |
| `WALLETCONNECT_PAIRING_FAILED`     | Pairing/session failed            | Failed to establish WalletConnect session          | Retry; ensure the wallet supports WalletConnect v2 |
| `USER_REJECTED`                    | User declined the request         | You rejected the wallet connection request         | Approve the request in the wallet popup/device     |
| `WALLET_LOCKED`                    | Wallet extension/device is locked | `<wallet>` wallet is locked                        | Unlock the wallet, then try again                  |
| `REQUEST_TIMEOUT`                  | No response before expiry         | The wallet did not respond in time                 | Try the request again                              |
| `LEDGER_DISCONNECTED`              | Device unplugged mid-request      | Ledger device disconnected                         | Reconnect, unlock, open the Stellar app            |
| `INVALID_KEY`                      | Public key unavailable            | Failed to retrieve your public key from the wallet | Disconnect and reconnect the wallet                |
| `UNKNOWN_ERROR`                    | Unmatched failure                 | Original error message                             | Retry or contact support                           |

### Wrong network (network mismatch)

Not an exception path — after a successful connection the app compares the
wallet's network against the configured app network:

> Your wallet is connected to **Testnet**, but this app requires **Mainnet**.
> Please switch your wallet to Mainnet to continue.

Signing is blocked while the mismatch persists. Switch the network in the
wallet extension (Freighter supports in-app switching; other wallets must be
switched externally) and the warning clears on the next validation.

### Adding a new scenario

1. Add a branch in `handleWalletConnectionError()` with a distinct `code`,
   specific `message`, actionable `helpText`, and `isRetryable` flag.
2. Add a row to the table above.
3. Cover it in `src/services/wallets/__tests__/errorHandling.test.ts`.

## Albedo

Albedo is a web wallet: there is no extension and no injected object. The
`@albedo-link/intent` package opens `https://albedo.link/confirm` in a popup and
exchanges intent requests with it over `postMessage`. Because every request can
be abandoned (popup blocked, closed, or ignored), Albedo calls are wrapped in
the shared 60-second signing timeout.

### Connection and signing flow

1. The connect modal offers Albedo as **Available** in any browser
   (`isAlbedoAvailable()` only checks for `window`).
2. `useAlbedo().connect()` calls `connectAlbedo()`, which requests the
   `public_key` intent. The result must contain a `pubkey`.
3. `getAlbedoNetwork()` reports the wallet's network (`pubnet` → `mainnet`),
   defaulting to `testnet` when the wallet cannot report one.
4. `useAlbedo().signTransaction(xdr)` calls the `tx` intent with the network
   passphrase from `ALBEDO_NETWORK_PASSPHRASES`. The signed
   `signed_envelope_xdr` is returned to the caller.

Albedo rejects intents with a plain `{ code, message }` object; the adapter
normalises it to an `Error` (`toAlbedoError`) so `handleWalletConnectionError()`
can classify it and the UI never displays `[object Object]`.

### Albedo error scenarios

| Scenario                         | What the user sees                                      | Recovery                                    |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| Popup blocked                    | `Popup was blocked` (generic wallet error)              | Allow popups for this site, then retry      |
| User rejects the request         | "You rejected the wallet connection request…"           | Approve in the Albedo popup                 |
| Popup closed without answering   | "The wallet did not respond in time" after 60s          | Open the popup again and approve            |
| No `pubkey` / no signed envelope | "Albedo did not return a public key/signed transaction" | Retry; check the Albedo account is unlocked |
| Unexpected network               | Falls back to `testnet` with no error                   | None needed                                 |

### Albedo tests

- `src/__tests__/albedo.test.ts` covers availability, connect success/failure,
  rejection, timeout, signing on testnet/futurenet/mainnet, and network
  fallbacks for both the service and `useAlbedo`.
- `e2e/albedo-wallet.spec.ts` drives the real `@albedo-link/intent` flow against
  a stand-in popup served by `e2e/fixtures/albedo.ts`. The fixture implements
  the Albedo protocol (handshake + `albedoIntentResult` messages), so the spec
  proves connection, rejection handling, keyboard access, and disconnect
  without depending on the live Albedo service.

## WalletConnect

WalletConnect lets mobile Stellar wallets connect by scanning a QR code or
following a deep link. The QR UI and deep links are rendered by
`@walletconnect/modal` when `SignClient.connect()` creates a session proposal;
`WalletConnectModal` wraps that flow with accessible states and configuration
guidance.

### Configuration

```bash
# .env.local
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_cloud_project_id
```

- `isWalletConnectAvailable()` is false when the project ID is missing, so the
  connect modal shows WalletConnect as unavailable instead of failing mid-flow.
- `src/config/walletconnect.ts` maps networks to CAIP-2 chain IDs:
  `mainnet → stellar:pubnet`, `testnet → stellar:testnet`,
  `futurenet → stellar:testnet`.
- Required Stellar methods: `stellar_signAndSubmitXDR`, `stellar_signXDR`,
  `stellar_getPublicKey`.
- The approved pairing (`topic`, `publicKey`, `network`) is persisted under
  `stellar-nebula:walletconnect` and cleared on disconnect.

### Session and signing flow

1. `WalletConnectModal` → `useWalletConnect().connect()` → context
   `connect('walletconnect')`.
2. `connectWalletConnect()` loads `@walletconnect/sign-client` lazily, opens the
   WalletConnect modal (QR code on desktop, deep links on mobile), waits for
   approval, and extracts the Stellar account from the session namespaces.
3. Signing uses `stellar_signXDR` on the session topic with the CAIP-2 chain ID;
   wallets may return `{ signedXDR }` or the signed XDR string, and both shapes
   are accepted.
4. Disconnect removes the persisted pairing and resets the client.

### WalletConnect error scenarios

| Scenario                      | What the user sees                                   | Recovery                                             |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Missing project ID            | "WalletConnect project ID is not configured"         | Set `VITE_WALLETCONNECT_PROJECT_ID`, restart the app |
| Pairing/session failure       | "Failed to establish WalletConnect session"          | Retry; confirm the wallet supports WalletConnect v2  |
| User rejects in mobile wallet | "You rejected the WalletConnect connection request"  | Approve the session in the mobile wallet             |
| Session missing while signing | "WalletConnect session not found. Please reconnect." | Reconnect the wallet                                 |

### WalletConnect tests

- `src/config/__tests__/walletconnect.test.ts` — chain mapping, project-ID
  configuration, namespaces, metadata.
- `src/hooks/__tests__/useWalletConnect.test.tsx` — context adaptation,
  non-WalletConnect wallets, signing guards, error passthrough.
- `src/components/Wallet/__tests__/WalletConnectModal.test.tsx` — QR/deep-link
  states, missing configuration, pairing errors, auto-close on approval.
