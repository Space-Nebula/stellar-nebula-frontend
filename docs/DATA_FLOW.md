# Data Flow

A concrete, code-grounded walkthrough of how data moves through the app for
three representative flows: connecting a wallet, submitting a contract
transaction, and receiving real-time updates over WebSocket. For the general
lifecycle summary and data-source overview, see
[`docs/ARCHITECTURE.md#data-flow`](ARCHITECTURE.md#data-flow); for what each
store/context involved here actually holds, see
[`docs/STATE_MANAGEMENT.md`](STATE_MANAGEMENT.md).

## 1. Wallet connect (and auto-reconnect)

Files involved: `src/contexts/WalletContext.tsx` (`WalletProvider`),
`src/services/wallets/*` (per-wallet adapters), `src/hooks/useFreighterWallet.ts`.

**Manual connect:**

1. User clicks a "Connect Wallet" button, which calls
   `WalletContext.connect(type)` with the chosen `WalletType`
   (`'freighter' | 'albedo' | 'ledger' | 'xbull' | 'walletConnect'`).
2. `WalletProvider` delegates to the matching adapter in
   `src/services/wallets/` (e.g. `freighter.ts`'s `connectFreighter()`),
   which talks to the browser extension or hardware device.
3. On success, `WalletProvider` sets `walletState` (`isConnected`,
   `publicKey`, `walletType`, `network`) and writes a `PersistedWallet`
   record to `localStorage` via `persistWallet(...)` so the session survives
   a page reload.
4. On failure, `error` is set from the adapter's thrown message; the UI
   reads `error` off the context and shows it (no retry is automatic here —
   the user re-clicks connect).

**Auto-reconnect on mount** (`WalletProvider`'s mount `useEffect`):

1. `loadPersistedWallet()` reads the `PersistedWallet` record. If none
   exists, nothing happens.
2. `isReconnecting` is set `true` and `validateWalletSession(persisted)` is
   called — this re-checks with the wallet/network that the session is
   still valid rather than trusting the cached value blindly.
3. If validation fails, `reconnectError` is set, the stale record is cleared
   with `clearPersistedWallet()`, and the user sees a "Previous wallet
   session expired. Please reconnect." message.
4. If validation succeeds, `walletState` is restored, the persisted record
   is refreshed (`persistWallet(...)`), a log line and a monitoring
   breadcrumb are recorded, and a `scan_started` analytics event fires with
   `action: 'wallet_auto_reconnect'`.

Nothing is written to a Zustand store directly by this flow — `WalletContext`
owns the live connection state itself. `userStore` (session/auth) and
`sessionStore` (session window + action log) are separate, app-level
concerns a component can update after a successful connect.

## 2. Contract call: scanning a nebula

Files involved: `src/hooks/contracts/useNebulaScan.ts`,
`src/services/contracts/soroban.ts` (`SorobanContractClient`),
`src/utils/stellar/simulate.ts`, `src/store/resourceStore.ts`.

See also the sequence diagram in
[`docs/diagrams/data-flow.md`](diagrams/data-flow.md).

1. UI calls `useNebulaScan({ contractId, signTransaction }).scan(nebulaId, scannerPublicKey)`.
2. The hook builds an unsigned transaction via
   `SorobanContractClient.buildScanTransaction({ nebulaId, scannerPublicKey })`.
3. Before asking the wallet to sign anything, the hook calls
   `simulateContractTransaction(unsignedXdr, { config })`. This is
   deliberate: a reverting contract call is caught and shown to the user as
   a simulation error _before_ they're prompted to sign, instead of failing
   only after a real submission. If `simulationResult.status === 'error'`,
   a `ContractError` is thrown and `scan()` returns `null`.
4. The hook calls `signTransaction(xdr)` (passed in from `WalletContext`),
   which prompts the connected wallet. A cancelled or failed signature also
   returns `null` from `scan()`.
5. `SorobanContractClient.submitScanTransaction(signedXdr)`:
   - Parses the signed XDR back into a `Transaction` and calls
     `server.sendTransaction(tx)`, wrapped in `retryAsync` with
     `shouldRetry: isRetryableStellarError` (2 retries) for transient RPC
     errors.
   - If the send itself comes back `status === 'ERROR'`, throws a
     `ContractError` with the decoded error XDR.
   - Otherwise polls `server.getTransaction(hash)` in `pollTransaction`
     until it sees `SUCCESS` (returns the result), `FAILED` (throws
     `ContractError('Transaction failed on-chain')`), or the attempt budget
     is exhausted (throws a timeout `ContractError`).
   - Parses the contract's return value in `parseScanResult` and returns a
     `ScanNebulaResult` including the `transactionHash`.
6. Back in the hook: on success, `result` and `simulation` state are set,
   `haptics.scanSuccess()` fires, and the result is returned to the caller.
   On any thrown error, `error` is set to a user-facing message and
   `haptics.error()` fires instead.
7. The calling UI component (not the hook itself) is responsible for turning
   a successful `ScanNebulaResult` into a store update — typically
   `resourceStore.harvestResource(...)` to record the harvest and update
   inventory, which re-renders anything subscribed to `resourceStore`.

**Error handling summary:** every layer below the UI throws a
`ContractError` (or lets a plain `Error` propagate) rather than swallowing
failures; `useNebulaScan` is the single place that converts those into
`error: string | null` state. Transient RPC failures are retried
automatically (`retryAsync`); user cancellation, simulation failure, and
on-chain failure are not retried and are surfaced immediately.

## 3. Real-time updates: WebSocket connection

Files involved: `src/services/websocket.ts` (`WebSocketManager`),
`src/hooks/useWebSocketStatus.ts`, `src/components/WebSocket/WebSocketStatus.tsx`.

1. `getWebSocketManager()` returns a shared `WebSocketManager` singleton,
   configured with exponential-backoff reconnect settings
   (`reconnectInitialDelay`, `reconnectMaxDelay`, `reconnectMultiplier`,
   `maxReconnectAttempts`), a heartbeat interval, and an offline message
   queue (`maxQueueSize`, `deduplicateQueue`, `persistQueue`).
2. `useWebSocketStatus(manager?)` subscribes to the manager's
   `onStatusChange` callback and exposes `ConnectionStatusDetails`
   (`status`, `attempt`, `maxAttempts`, `nextRetryDelayMs`,
   `queuedMessageCount`, `isOnline`) plus `isConnected` / `isReconnecting`
   booleans and `reconnect()` / `clearQueue()` actions.
3. `WebSocketStatus` (in `src/components/WebSocket/`) renders that hook's
   state directly — e.g. a reconnecting indicator with the next retry delay,
   or a "N messages queued" badge when the socket is offline.
4. While disconnected, outgoing messages are queued (keyed and optionally
   deduplicated) and, if `persistQueue` is enabled, written to
   `localStorage` under `stellar_nebula_ws_queue` so a page reload doesn't
   lose queued messages; on reconnect the manager flushes the queue.

This flow is independent of the Zustand stores — it's connection-status
state, not game state — but any handler registered on the manager (via its
pub/sub `Handler` type) can update `gameStore`, `resourceStore`, etc. in
response to a pushed message, the same way a contract-call result does in
flow 2.

## Where to look next

- [`docs/STATE_MANAGEMENT.md`](STATE_MANAGEMENT.md) — what every store and
  context involved above actually holds and persists.
- [`docs/diagrams/`](diagrams/) — the diagram source files referenced inline.
- [`docs/API_REFERENCE.md`](API_REFERENCE.md) and
  [`docs/API/hooks.md`](API/hooks.md) — full hook/service signatures.
- [`docs/ERROR_CODES.md`](ERROR_CODES.md) — the `C-` error codes raised by
  the contract layer referenced in flow 2.
