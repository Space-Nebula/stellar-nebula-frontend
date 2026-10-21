# State Management — Asset Balances

This document describes how account balances are fetched, cached, and kept in
sync with the chain (#456). Wallet connection/session state lives in
`WalletContext`; balances are deliberately kept out of the global store because
they are per-account server state with a short lifetime.

## Pieces

| Module                                    | Responsibility                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `src/utils/horizon-utils.ts`              | Fetch + format Horizon balances, cache helpers, HTTP-status extraction     |
| `src/services/balance-watcher.ts`         | Polling loop (default 5s), overlap guard, unfunded/error classification    |
| `src/hooks/useAssetBalance.ts`            | React state: balances, loading flags, change highlight, manual `refresh()` |
| `src/utils/stellar/balance.ts`            | Backwards-compatible `useAccountBalances` view used by `WalletDisplay`     |
| `src/components/Wallet/WalletDisplay.tsx` | Renders XLM/asset chips, live indicator, and the manual refresh control    |

## Lifecycle

1. When a wallet connects, `WalletDisplay` renders and passes
   `walletState.publicKey` to `useAccountBalances` → `useAssetBalance`.
2. `useAssetBalance` immediately paints the cached snapshot for that account
   (`stellar-nebula:balance-cache:<accountId>` in `localStorage`) so the header
   never flashes empty on reload/remount.
3. `createBalanceWatcher` starts: it fetches at once, then schedules the next
   poll **only after the previous request settles**. Overlapping polls are
   impossible by construction, and `refresh()` during an in-flight poll joins
   the existing request instead of queueing another.
4. Every successful poll updates state, saves the cache (only when the values
   actually changed), and briefly highlights the balance chip.
5. On account switch or unmount, `watcher.stop()` clears the timer; a late
   response cannot update an unmounted component.

## Polling policy

- **Interval:** 5 seconds (`DEFAULT_BALANCE_POLL_INTERVAL_MS`). This is the
  acceptance threshold for "balances update after transactions" without
  hammering Horizon.
- **Transient failures:** the error is surfaced through `onError` (rendered as
  the "Error loading balance" chip while no balances are available) and polling
  keeps retrying — a single failed poll never kills the loop.
- **Unfunded accounts:** a Horizon `404` is not an error. The snapshot becomes
  `{ balances: [], unfunded: true }` and the UI shows the `Unfunded (0 XLM)`
  chip.
- **Manual refresh:** `refresh()` fetches immediately and resets the timer, so
  a user click cannot be followed by a duplicate poll a moment later.

## Why not a Horizon stream?

The previous implementation subscribed to `server.payments().stream()`. Streams
are long-lived EventSource connections that need their own reconnect logic, do
not fire for every balance-changing operation (trustlines, DEX fills,
sponsorship), and are awkward to test. A 5-second poll is simpler to reason
about, works through proxies, and covers all balance mutations. Payment
streaming can be added later for ledger-time latency without changing this
hook's public shape.

## Testing

- `src/services/__tests__/balance-watcher.test.ts` — polling cadence, overlap
  protection, 404 → unfunded, error → retry, `stop()`.
- `src/hooks/__tests__/useAssetBalance.test.tsx` — cache paint, change
  highlight, manual refresh, loading/error flags.
