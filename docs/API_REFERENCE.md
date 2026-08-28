# API Reference

Comprehensive reference for the public API of the Nebula Nomad frontend: custom hooks, services, and Soroban contract interfaces. This document is intended for developers integrating with or extending the codebase.

All public APIs live under `src/` and are re-exported from barrel `index` modules (`src/hooks/index.ts`, `src/services/index.ts`, `src/utils/stellar/index.ts`). Prefer importing from the barrels so you stay on the public, stable surface rather than deep internal paths.

## Table of Contents

- [Path Aliases](#path-aliases)
- [Custom Hooks](#custom-hooks)
- [Contract Services & Interfaces](#contract-services--interfaces)
- [Wallet Services](#wallet-services)
- [Asset & NFT Services](#asset--nft-services)
- [Stellar Utilities](#stellar-utilities)
- [API Client](#api-client)
- [Analytics, Logging & Monitoring](#analytics-logging--monitoring)
- [Data Sync & WebSocket](#data-sync--websocket)
- [Storage & Cache](#storage--cache)
- [Toast Utilities](#toast-utilities)

## Path Aliases

The following aliases are configured in `tsconfig.app.json` and `vite.config.ts`:

| Alias         | Resolves to      |
| ------------- | ---------------- |
| `@/`          | `src/`           |
| `@services`   | `src/services`   |
| `@config`     | `src/config`     |
| `@constants`  | `src/constants`  |
| `@contexts`   | `src/contexts`   |
| `@store`      | `src/store`      |
| `@utils`      | `src/utils`      |
| `@components` | `src/components` |
| `@hooks`      | `src/hooks`      |

## Custom Hooks

All hooks are exported from `src/hooks/index.ts`.

### `useFreighterWallet`

Manages the Freighter wallet lifecycle: connection state, public key, wallet type, and network.

```ts
import { useFreighterWallet } from '@/hooks'

function WalletButton() {
  const { walletState, connect, disconnect, signTransaction, isLoading, error } =
    useFreighterWallet()

  return (
    <button onClick={connect} disabled={isLoading}>
      {error ?? (walletState.isConnected ? walletState.publicKey : 'Connect Freighter')}
    </button>
  )
}
```

**Returns**

- `walletState: WalletState` — `{ isConnected, publicKey, walletType, network }`
- `connect: () => Promise<void>` — prompts the user to connect Freighter
- `disconnect: () => void`
- `signTransaction: (xdr: XDR) => Promise<XDR | null>` — signs a base64 XDR
- `isLoading: boolean`
- `error: string | null`

---

### `useSignTransaction`

Low-level helper to build, sign, submit, and poll a transaction through the connected wallet.

```ts
import { useSignTransaction } from '@/hooks'

const { signAndSubmit, isLoading, error, result, reset } = useSignTransaction()

const handle = async () => {
  const outcome = await signAndSubmit(async () => {
    // Build an unsigned XDR here
    return xdr
  })
}
```

**Options** (`SignTransactionOptions`)

- `rpcUrl?: string`
- `networkPassphrase?: string`

**Returns**

- `signAndSubmit(buildTransaction: BuildTransactionFn, options?): Promise<TransactionSubmissionResult | null>`
- `isLoading`, `error`, `result: TransactionSubmissionResult | null`, `reset()`

---

### `useLocalStorage`

Persists state to `localStorage` with the same API as `useState`.

```ts
import { useLocalStorage } from '@/hooks'

const [settings, setSettings] = useLocalStorage<Settings>('nebula:settings', defaults)
```

**Parameters**

- `key: string`
- `initial: T`

**Returns** `[T, (value: T | ((prev: T) => T)) => void]` — state tuple identical to `useState`.

---

### `useDebounce`

Debounces a value; updates only after `delay` ms of inactivity.

```ts
import { useDebounce } from '@/hooks'

const debouncedQuery = useDebounce(query, 400)
```

**Parameters**

- `value: T`
- `delay?: number` — default `300`

**Returns** `T`

---

### `useTouchGestures`

Attaches touch gesture handlers (pinch zoom, swipe rotate, two-finger pan, tap) to a target DOM element.

```ts
import { useRef } from 'react'
import { useTouchGestures } from '@/hooks'
import type { TouchGestureCallbacks } from '@/hooks/useTouchGestures'

const ref = useRef<HTMLDivElement>(null)
useTouchGestures(ref, {
  onPinchZoom: (delta) => console.log('zoom', delta),
  onSwipeRotate: (dx, dy) => console.log('rotate', dx, dy),
  onTap: (x, y) => console.log('tap', x, y),
})
```

**Parameters**

- `targetRef: RefObject<HTMLElement>`
- `callbacks: TouchGestureCallbacks` — `onPinchZoom?`, `onSwipeRotate?`, `onTwoFingerPan?`, `onTap?`

---

### `useNebulaZoom`

Provides nebula camera zoom level configuration and derived camera values for the Three.js scene.

```ts
import { useNebulaZoom, ZOOM_LEVELS } from '@/hooks'
```

**Exports**

- `ZOOM_LEVELS: Record<ZoomLevel, ZoomLevelConfig>` — predefined `overview`, `exploration`, `detail` levels
- `ZoomLevelConfig` — `{ label, minDistance, maxDistance, targetDistance, particleDensity }`
- `useNebulaZoom()` — returns current zoom state and controls for the `r3f` scene

---

### `useFrameRateMonitor`

Monitors the browser frame rate via `requestAnimationFrame`.

```ts
import { useFrameRateMonitor } from '@/hooks'

const { fps, averageFps, isWithinTarget } = useFrameRateMonitor({
  targetFps: 60,
  sampleWindowMs: 1000,
})
```

**Options** (`UseFrameRateMonitorOptions`)

- `enabled?: boolean` — default `true`
- `targetFps?: number` — default `60`
- `sampleWindowMs?: number` — default `1000`
- `onSample?: (sample: FpsBenchmarkSample) => void`

**Returns** `{ fps, averageFps, sampleCount, isWithinTarget }`

---

### `useRenderResourceTracker`

Tracks Three.js render resources (geometries, materials, textures) for memory leak detection. See `src/hooks/useRenderResourceTracker.ts`.

---

### Contract Hooks

Contract hooks are exported from `src/hooks/contracts/index.ts` and re-exported by `src/hooks/index.ts`.

#### `useNebulaScan`

Scans a nebula zone via a Soroban contract and returns the harvested resource.

```ts
import { useNebulaScan } from '@/hooks'
import type { UseNebulaScanOptions, UseNebulaScanReturn } from '@/hooks'

function ScanButton({ contractId }: { contractId: string }) {
  const { scan, isLoading, error, result, reset } = useNebulaScan({
    contractId,
    signTransaction: (xdr) => wallet.signTransaction(xdr),
  })

  return (
    <button disabled={isLoading} onClick={() => scan(nebulaId, publicKey)}>
      {isLoading ? 'Scanning…' : 'Scan Nebula'}
    </button>
  )
}
```

**Options** (`UseNebulaScanOptions`)

- `contractId: string` — Soroban contract address (`C…`)
- `signTransaction: (xdr: XDR) => Promise<XDR | null>`

**Returns** (`UseNebulaScanReturn`)

- `scan(nebulaId, scannerPublicKey): Promise<ScanNebulaResult | null>`
- `isLoading`, `error`, `result: ScanNebulaResult | null`, `reset()`

#### `useShipUpgrade`

Manages the full ship upgrade lifecycle: NFT metadata, resource balances, quote, simulation, and on-chain submission.

```ts
import { useShipUpgrade } from '@/hooks'

function UpgradePanel({ shipId }: { shipId: string }) {
  const {
    shipNFT,
    quote,
    simulation,
    updatedStats,
    isLoading,
    error,
    refresh,
    buildUpgradeTransaction,
    executeUpgrade,
  } = useShipUpgrade(shipId)

  return <button onClick={executeUpgrade}>Upgrade</button>
}
```

**Parameters**

- `shipId: string | null | undefined`
- `accountId?: string | null` — falls back to wallet public key
- `config?: StellarNetworkConfig` — network override

**Returns** (`UseShipUpgradeResult`)

- `shipNFT: ShipNFTRecord | null`
- `resourceSnapshot: ResourceAssetSnapshot | null`
- `quote: ShipUpgradeQuote | null`
- `simulation: ShipUpgradeBuildResult['simulation'] | null`
- `updatedStats: ShipUpgradeStats | null`
- `isLoading`, `error: string | null`
- `refresh(): Promise<void>`
- `buildUpgradeTransaction(): Promise<ShipUpgradeBuildResult | null>`
- `executeUpgrade(): Promise<string | null>` — returns the transaction hash on success

---

## Contract Services & Interfaces

All contract services are exported from `src/services/contracts/index.ts`.

### `SorobanContractClient`

Client for building and submitting Soroban contract transactions.

```ts
import { SorobanContractClient, ContractError } from '@/services/contracts'
import { getActiveStellarConfig } from '@/config/stellar'

const client = new SorobanContractClient(contractId, getActiveStellarConfig())

const xdr = await client.buildScanTransaction({
  nebulaId: 'nebula-1',
  scannerPublicKey: publicKey,
})

// sign with the wallet, then submit
const result = await client.submitScanTransaction(signedXdr)
```

**Constructor**

- `new SorobanContractClient(contractId: string, config?: StellarNetworkConfig)`

**Methods**

- `buildScanTransaction(params: ScanNebulaParams, options?: ContractCallOptions): Promise<XDR>` — builds an unsigned, prepared XDR
- `submitScanTransaction(signedXdr: XDR): Promise<ScanNebulaResult>` — submits and polls for the result

**Types**

- `ScanNebulaParams` — `{ nebulaId: string; scannerPublicKey: string }`
- `ScanNebulaResult` — `{ resourceType: ResourceType; amount: number; transactionHash: string }`
- `ContractCallOptions` — `{ fee?: string; timeoutSeconds?: number }`
- `ContractError extends Error` — thrown on contract/submission failures

---

### Ship Upgrade Module

Pure helpers and transaction builders from `src/services/contracts/shipUpgrade.ts`.

```ts
import {
  calculateUpgradeRequirements,
  calculateUpgradedStats,
  validateUpgrade,
  buildShipUpgradeTransaction,
} from '@/services/contracts'
```

- `calculateUpgradeRequirements(shipId: string, ship: ShipNFTRecord | null): ShipUpgradeRequirements`
- `calculateUpgradedStats(ship: ShipNFTRecord | null): ShipUpgradeStats`
- `validateUpgrade(requirements, balances): ShipUpgradeQuote`
- `buildShipUpgradeTransaction(params): Promise<ShipUpgradeBuildResult>`

**Types**

- `ShipUpgradeStats` — `{ hull, shield, speed, cargoCapacity, crewCapacity }`
- `ShipUpgradeRequirements` — `{ credits, stardust, nebulite, cosmicDust }`
- `ShipUpgradeQuote` — `{ canUpgrade, missing, requirements, updatedStats }`
- `ShipUpgradeBuildResult` — `{ xdr, transaction, quote, simulation }`

---

## Wallet Services

Exported from `src/services/wallets/index.ts`.

```ts
import {
  isFreighterInstalled,
  connectFreighter,
  signTransactionWithFreighter,
  getFreighterNetwork,
  connectAlbedo,
  signTransactionWithAlbedo,
  getAlbedoNetwork,
} from '@/services/wallets'
```

| Function                                                                       | Description                             |
| ------------------------------------------------------------------------------ | --------------------------------------- |
| `isFreighterInstalled(): Promise<boolean>`                                     | Detects the Freighter browser extension |
| `connectFreighter(): Promise<PublicKey>`                                       | Requests public key from Freighter      |
| `signTransactionWithFreighter(xdr: XDR): Promise<XDR>`                         | Signs a base64 XDR                      |
| `getFreighterNetwork(): Promise<StellarNetwork>`                               | Reads Freighter's active network        |
| `connectAlbedo(): Promise<PublicKey>`                                          | Requests public key from Albedo         |
| `signTransactionWithAlbedo(xdr: XDR, networkPassphrase: string): Promise<XDR>` | Signs via Albedo                        |
| `getAlbedoNetwork(): Promise<StellarNetwork>`                                  | Reads Albedo's active network           |

**Types**

- `WalletState` — `{ isConnected, publicKey, walletType, network }`
- `PublicKey` — a Stellar `G…` address
- `XDR` — base64-encoded transaction envelope
- `StellarNetwork` — `'testnet' | 'futurenet' | 'mainnet'`

---

## Asset & NFT Services

Exported from `src/services/assets/resources.ts`, `src/services/assets/trustlines.ts`, and `src/services/nft/shipNFT.ts`.

### `fetchResourceAssetSnapshot`

```ts
import { fetchResourceAssetSnapshot } from '@/services/assets/resources'
import type { ResourceAssetSnapshot, ResourceAssetBalance } from '@/services/assets/resources'

const snapshot: ResourceAssetSnapshot = await fetchResourceAssetSnapshot(publicKey, config, {
  forceRefresh: true,
})
```

**Parameters**

- `accountId: string`
- `config?: StellarNetworkConfig`
- `options?: { forceRefresh?: boolean }` — bypasses the 15s cache

**Returns** `Promise<ResourceAssetSnapshot>` — `{ accountId, balances: ResourceAssetBalance[], fetchedAt }`

### `checkTrustline`

```ts
import { checkTrustline } from '@/services/assets/trustlines'
import type { TrustlineStatus } from '@/services/assets/trustlines'

const status: TrustlineStatus = await checkTrustline(accountId, 'USDC', issuer)
```

Returns `Promise<TrustlineStatus>` — `{ assetCode, assetIssuer, isEstablished, balance, limit }`.

### Ship NFT

```ts
import { fetchShipNFT, clearShipNFTCache } from '@/services/nft/shipNFT'
import type { ShipNFTRecord, ShipNFTMetadata, ShipNFTAttribute } from '@/services/nft/shipNFT'
```

- `fetchShipNFT(accountId, config?, options?): Promise<ShipNFTRecord>` — reads the account's ship NFT metadata (30s cache)
- `clearShipNFTCache(accountId: string): void` — invalidates the NFT cache

**Types**

- `ShipNFTRecord` — `{ accountId, assetCode, issuer?, metadata, metadataUri?, fetchedAt }`
- `ShipNFTMetadata` — `{ name, description?, image?, model?, tier?, stats?, attributes? }`
- `ShipNFTAttribute` — `{ trait_type: string; value: string | number | boolean }`

---

## Stellar Utilities

Exported from `src/utils/stellar/index.ts`.

### Retry

```ts
import { retryAsync, isRetryableStellarError } from '@/utils/stellar'
import type { RetryOptions } from '@/utils/stellar'

const result = await retryAsync(() => rpcServer.sendTransaction(tx), {
  retries: 3,
  shouldRetry: (err) => isRetryableStellarError(err),
})
```

- `retryAsync<T>(operation, options: RetryOptions): Promise<T>` — exponential backoff with retry
- `isRetryableStellarError(error: unknown): boolean` — `true` for transient network/timeout/server errors; never retries user cancellations

### Contract Response Parsing

```ts
import {
  parseContractResponseXdr,
  parseSimulationResponse,
  parseResponseValue,
  ContractResponseParseError,
} from '@/utils/stellar'
import type { ParsedContractResponse, ParsedSimulationResult } from '@/utils/stellar'
```

- `parseContractResponseXdr<T>(xdr: string): ParsedContractResponse<T>`
- `parseSimulationResponse<T>(xdr): ParsedSimulationResult<T>`
- `parseResponseValue(value): ContractNativeValue`
- `ContractResponseParseError extends Error`

### Simulation

```ts
import { simulateContractTransaction } from '@/utils/stellar'
import type { SimulateContractTransactionOptions } from '@/utils/stellar'

const result = await simulateContractTransaction(tx, options)
```

### Fee Estimation

```ts
import {
  estimateTransactionFee,
  formatFeeInXlm,
  MIN_TRANSACTION_FEE_STROOPS,
} from '@/utils/stellar'
import type { FeeEstimateInput, FeeEstimateResult } from '@/utils/stellar'

const estimate: FeeEstimateResult = await estimateTransactionFee(input)
const xlm = formatFeeInXlm(estimate.stroops)
```

### Balance

```ts
import { formatBalance, useAccountBalances } from '@/utils/stellar'
import type { FormattedBalance } from '@/utils/stellar'

const formatted: FormattedBalance = formatBalance(balanceLine)
const { balances, isLoading } = useAccountBalances(accountId)
```

### Batch Transactions

```ts
import { createBatchTransactionBuilder } from '@/utils/stellar'
import type { BatchOperation } from '@/utils/stellar'
```

- `createBatchOperation<TKind, TPayload>(input): BatchOperation`
- `calculateBatchFee(operations, baseFee?): number`
- `validateBatchOperations(operations): BatchTransactionValidationError[]`
- `buildBatchTransaction(plan): Transaction`
- `createBatchTransactionBuilder(ops): BatchTransactionBuilder`
- Constants: `DEFAULT_BATCH_BASE_FEE_STROOPS` (= 100), `MAX_BATCH_OPERATIONS` (= 100)

---

## API Client

Exported from `src/services/api.ts`. Thin typed wrapper around `fetch` with interceptors and retry.

```ts
import { get, post, put, del, addRequestInterceptor, addResponseInterceptor } from '@/services/api'
import type { ApiResponse, ApiError } from '@/services/api'

const res: ApiResponse<MyData> = await get('/data', { headers: { Accept: 'application/json' } })

const cleanup = addRequestInterceptor((config) => {
  config.headers = { ...config.headers, Authorization: bearer }
  return config
})
```

| Function                                                  | Description                                    |
| --------------------------------------------------------- | ---------------------------------------------- |
| `get<T>(path, options?): Promise<ApiResponse<T>>`         | GET request                                    |
| `post<T>(path, body?, options?): Promise<ApiResponse<T>>` | POST request                                   |
| `put<T>(path, body?, options?): Promise<ApiResponse<T>>`  | PUT request                                    |
| `del<T>(path, options?): Promise<ApiResponse<T>>`         | DELETE request                                 |
| `addRequestInterceptor(fn): () => void`                   | Register request interceptor; returns cleanup  |
| `addResponseInterceptor(fn): () => void`                  | Register response interceptor; returns cleanup |

**Types**

- `ApiResponse<T>` — `{ data: T | null; error: ApiError | null; status: number }`
- `ApiError` — `{ message: string; status: number; code?: string }`
- `ApiRequestConfig` — `RequestInit & { url: string; retries?: number }`

---

## Analytics, Logging & Monitoring

### Analytics

Exported from `src/services/analytics.ts`.

```ts
import { analytics, trackEvent, sanitizeAnalyticsPayload } from '@/services/analytics'
import type { AnalyticsEventName } from '@/services/analytics'

trackEvent('scan_completed', { resourceType: 'nebulite', amount: 42 })
```

- `trackEvent(name: AnalyticsEventName, payload): void`
- `analytics` — default `AnalyticsTracker` instance with `enable()`, `disable()`, `flush()`
- `sanitizeAnalyticsPayload(payload)` — strips PII-like keys (address, account, secret, token, etc.)

**Event Names** (`AnalyticsEventName`)

`scan_started`, `scan_completed`, `upgrade_started`, `upgrade_confirmed`, `upgrade_failed`, `error_reported`, `performance_metric`

### Logging

Exported from `src/services/logging.ts`.

```ts
import { logger, createScopedLogger } from '@/services/logging'
import type { LogLevel } from '@/services/logging'

logger.setLogLevel('info')
logger.info('app started', { version: '1.0.0' })

const log = createScopedLogger('MyComponent')
log.warn('something suspicious')
```

- `logger` — global singleton `Logger`
- `createScopedLogger(namespace: string)` — returns a logger prefixed with the namespace
- `LogLevel` — `'debug' | 'info' | 'warn' | 'error'`

### Monitoring

Exported from `src/services/monitoring.ts`.

```ts
import { initializeMonitoring } from '@/services/monitoring'
import type { MonitoringConfig } from '@/services/monitoring'

initializeMonitoring({
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? null,
  sentryEnvironment: 'production',
  logRocketAppId: null,
  enablePerformanceMonitoring: true,
})
```

### Error Tracking

Exported from `src/services/errorTracking.ts`.

```ts
import { initErrorTracking, setSentryUser } from '@/services/errorTracking'
import type { ErrorTrackingConfig } from '@/services/errorTracking'

initErrorTracking({ dsn, environment })
setSentryUser(publicKey) // or setSentryUser(null) to clear
```

---

## Data Sync & WebSocket

### `DataSync<T>`

Exported from `src/services/sync.ts`. Generic offline/online synchroniser.

```ts
import { DataSync } from '@/services/sync'
import type { SyncOptions } from '@/services/sync'

const sync = new DataSync<RemoteData>({
  intervalMs: 30000,
  fetcher: () => api.get('/data').then((r) => r.data!),
  getLocal: () => storage.get('data'),
  setLocal: (v) => storage.set('data', v),
})

sync.start()
sync.stop()
await sync.manualSync()
```

**Options** (`SyncOptions<T>`)

- `intervalMs?: number`
- `fetcher: () => Promise<T>`
- `getLocal: () => Promise<T | null>`
- `setLocal: (v: T) => Promise<void>`
- `onConflict?: (local, remote) => T`
- `onSync?: (merged: T) => void`

### `WebSocketManager`

Exported from `src/services/websocket.ts`. Manages a WebSocket connection with reconnection, heartbeats, and pub/sub.

```ts
import { WebSocketManager } from '@/services/websocket'

const ws = new WebSocketManager('wss://api.example.com/ws')
ws.connect()
const unsub = ws.subscribe('scan_result', (data) => console.log(data))
ws.subscribeToAccount('G...')
// later: unsub(); ws.disconnect()
```

---

## Storage & Cache

### `StorageManager`

Exported from `src/utils/storage.ts`.

```ts
import { StorageManager } from '@/utils/storage'
import type { StorageOptions } from '@/utils/storage'

const storage = new StorageManager({
  prefix: 'stellar-nebula:',
  storage: window.localStorage, // or sessionStorage
})

storage.setItem('theme', 'dark')
const theme = storage.getItem('theme')
```

### `SimpleCache<T>`

Exported from `src/utils/cache.ts`.

```ts
import { SimpleCache } from '@/utils/cache'

const cache = new SimpleCache<Foo>({ ttlMs: 60_000 })
cache.set('key', value)
const value = cache.get('key')
```

---

## Toast Utilities

Exported from `src/utils/toast.ts`. Wraps `react-hot-toast`.

```ts
import { showSuccess, showError, showLoading, updateToast, dismissToast } from '@/utils/toast'

const id = showLoading('Signing…')
showSuccess('Transaction confirmed')
showError('Failed to submit transaction')
updateToast(id, 'Still waiting…')
dismissToast(id)
```

- `showSuccess(message, options?): string`
- `showError(message, options?): string`
- `showLoading(message, options?): string`
- `updateToast(toastId?, message, options?): void`
- `dismissToast(toastId?): void`
