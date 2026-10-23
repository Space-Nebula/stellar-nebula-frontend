# State Management

This is a concrete, field-by-field reference for every Zustand store
(`src/store/`) and React context (`src/contexts/`) in the app. For the
general pattern these follow (why Zustand, the `persist`/`devtools`
middleware shape, naming conventions), see
[`docs/ARCHITECTURE.md#state-management-patterns`](ARCHITECTURE.md#state-management-patterns)
and [ADR 0001](adr/0001-use-zustand-over-redux.md). For a diagram of how these
map to consumers, see
[`docs/diagrams/state-management.md`](diagrams/state-management.md).

## Zustand stores (`src/store/`)

All stores below (except `renderStatsStore`) use Zustand's `persist` middleware
with a `partialize` selector — only the listed fields are written to
`localStorage`, under the keys in `src/store/storageKeys.ts`, and only those
fields are restored on load. Each persisted store also carries a numeric
schema `version`; `src/store/stateMigration.ts` provides the version-aware
migration helpers (`getAppVersion`, migration logging) a store's `migrate`
function can call when its persisted shape changes between releases.

### `gameStore`

- **State**: `phase`, `currentNebulaId`, `activeOperation`, `scanCooldowns`,
  `elapsedSeconds`, `optimisticOperations`, `lockedOperations`,
  `operationQueue`, `pendingState`.
- **Persisted fields**: `phase`, `currentNebulaId`, `scanCooldowns`,
  `elapsedSeconds` (storage key `stellar-nebula:game-store`).
- **Notable actions**: `acquireLock` / `releaseLock` / `queueOperation` /
  `startOperationWithLock` implement a locking + queue so concurrent scan or
  upgrade attempts don't race (issue #230).
- **Consumers**: the nebula canvas and scan controls (`src/components/Canvas`,
  `src/components/Nebula`) and the contract hooks that start/complete
  operations.

### `shipStore`

- **State**: `ships: Ship[]`, `activeShipId`, `optimisticTransactions`.
- **Persisted fields**: `ships`, `activeShipId`.
- **Notable actions**: `applyOptimisticShipUpdate` / `confirmOptimisticShipUpdate`
  / `rollbackOptimisticShipUpdate` implement optimistic UI updates for ship
  upgrades — the UI updates immediately, then rolls back if the on-chain
  transaction fails.
- **Consumers**: `src/components/Ship`, `src/components/Dashboard`
  (`useShipUpgradeFlow`).

### `resourceStore`

- **State**: `inventory`, `harvested`, `harvestLog`, `optimisticTransactions`,
  `harvestHistory`, `lastHarvest`.
- **Persisted fields**: `inventory`, `harvested`, `harvestLog`,
  `harvestHistory`, `lastHarvest`.
- **Notable actions**: `harvestResource` records a harvest event and updates
  balances in one call — this is what the nebula-scan flow calls after a
  successful contract submission (see [`docs/DATA_FLOW.md`](DATA_FLOW.md)).
- **Consumers**: `src/components/Resources`, `src/components/Marketplace`,
  `src/components/History`.

### `settingsStore`

- **State**: `graphicsQuality`, `soundEnabled`, `notificationsEnabled`,
  `analyticsEnabled`, `network`, `adaptivePerformance`, `targetFps`,
  `particleCountMultiplier`, `fpsMonitoringEnabled`, `lowPowerMode`.
- **Persisted**: the whole state (user preferences).
- **Consumers**: `src/components/Settings`, the adaptive-performance hooks
  (`useAdaptivePerformanceMode`, `useFrameRateMonitor`).

### `userStore`

- **State**: `session: UserSession | null` (`id`, `handle`, `walletAddress`,
  `roles`), `isAuthenticated`.
- **Persisted**: `session`, `isAuthenticated`.
- **Consumers**: profile/account UI and anywhere a display handle or role
  check is needed; kept separate from `WalletContext`, which owns the live
  wallet connection rather than the app-level user session.

### `tutorialStore`

- **State**: `completed`, `currentStep`, `dismissed`, `startedAt`,
  `completedObjectives`.
- **Persisted**: the whole state, so a player's tutorial progress survives a
  reload.
- **Consumers**: `src/components/Tutorial`.

### `sessionStore`

- **State**: `session: Session | null` (`walletAddress`, `lastLogin`,
  `expiresAt`, `preferences`), `startTime`, `duration`, `actions: string[]`,
  `syncStatus`.
- **Persisted fields**: `session`, `startTime`, `duration`, `actions`,
  `syncStatus`.
- **Notable actions**: `openSession(walletAddress, ttlMs?)` starts a session
  with a default 24 h TTL; `refreshSession` extends it; `isExpired` reports
  whether the stored session has lapsed. This is also the one store wired up
  to Zustand's `devtools` middleware (`name: 'SessionStore'`, dev-only) for
  time-travel debugging.
- **Consumers**: analytics/debugging surfaces and anywhere session-length or
  action-history needs to be read. Note this is distinct from `userStore`:
  `sessionStore` tracks the _current session window_ (start time, duration,
  action log), while `userStore` tracks _who_ is logged in.

### `graphicsStore`

- **State**: `bloomEnabled`, `bloomIntensity`, `performanceMode`,
  `starfieldDensity`, `zoomLevel`, `autoRotateEnabled`.
- **Persisted**: the whole state.
- **Consumers**: the Three.js canvas and camera controls
  (`src/components/Canvas`, `useNebulaZoom`).

### `achievementStore`

- **State**: `stats`, `unlockedAtById`, `eventLog`, `pendingNotifications`.
- **Persisted fields**: `stats`, `unlockedAtById`, `eventLog`.
- **Notable actions**: `recordScanCompleted`, `recordUpgradeCompleted`,
  `recordShareCreated` each append a `GameEvent`, evaluate unlock conditions,
  and return any newly-unlocked achievements for the UI to toast.
- **Consumers**: `src/components/Achievements`, `src/components/Leaderboard`.

### `renderStatsStore` (not persisted)

- **State**: `drawCalls`, `triangles`, `geometries`, `textures`, `updatedAt`.
- Live Three.js renderer diagnostics (issue #322), read from
  `WebGLRenderer.info` by a collector mounted inside the R3F `<Canvas>` and
  reset every time the canvas remounts. Intentionally excluded from
  `persist` — this is debug telemetry, not game state.
- **Consumers**: `src/components/Debug`, the FPS/perf overlays.

### Cross-cutting: `storePerformanceMonitor.ts`

Not a store itself — a middleware factory (`createPerformanceMonitor`) any
store can wrap itself in to track update frequency and log slow updates. See
the file's module doc comment for the wiring example.

## React contexts (`src/contexts/`)

Contexts are used instead of a store for state that's either inherently
request/connection-shaped (wallet, network) or UI-chrome state that doesn't
need localStorage persistence (theme, notifications, modals) — see
[`docs/ARCHITECTURE.md#context-pattern`](ARCHITECTURE.md#2-context-pattern) for
the rationale.

### `WalletContext` / `WalletProvider`

The largest context: `walletState`, `isLoading`, `error`, `isReconnecting`,
`reconnectError`, install/availability flags for every supported wallet
(`isFreighterInstalled`, `isAlbedoAvailable`, `isLedgerAvailable`,
`isXBullInstalled`, `isWalletConnectAvailable`), `networkMismatchWarning`, and
the `connect` / `disconnect` / `switchWallet` / `signTransaction` actions.
On mount it attempts to auto-reconnect from a `PersistedWallet` record in
localStorage, validating the session before restoring `walletState` — see the
wallet-connect flow in [`docs/DATA_FLOW.md`](DATA_FLOW.md). This persistence
is hand-rolled (`persistWallet`/`loadPersistedWallet`/`clearPersistedWallet`),
not a Zustand `persist` store, because the auto-reconnect needs to run a live
session-validation network call before trusting the cached value.

### `ThemeContext` / `ThemeProvider`

Minimal: `theme`, `toggleTheme`. Persists to a plain `localStorage` key
(`'theme'`), not through the Zustand/`storageKeys.ts` registry.

### `NotificationContext` / `NotificationProvider`

In-app notification queue: `notifications: AppNotification[]`, `unreadCount`,
and `addNotification` / `markAsRead` / `markAllAsRead` / `clearAll`. Not
persisted — notifications are session-local.

### `ModalContext` / `ModalProvider`

A modal stack (`ModalEntry[]` built from `ModalOptions`), so any component can
push/pop modals without prop-drilling a single `<Modal>` instance. Not
persisted.

### `NetworkContext` / `NetworkProvider`

`currentNetwork`, `switchNetwork`, `isLoading`, `error`. Lets any component
request a Stellar network switch (testnet/futurenet/mainnet) and observe the
in-flight state, independent of `settingsStore.network`, which records the
user's _preferred_ network rather than driving the switch itself.

## Where to look next

- [`docs/DATA_FLOW.md`](DATA_FLOW.md) — how these stores and contexts get
  updated end-to-end, for three concrete flows.
- [`docs/diagrams/state-management.md`](diagrams/state-management.md) — a
  diagram of the above grouped by consumer.
- [`docs/ARCHITECTURE.md#state-management`](ARCHITECTURE.md#6-state-management-srcstore)
  — the short summary version, as part of the full architecture doc.
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
