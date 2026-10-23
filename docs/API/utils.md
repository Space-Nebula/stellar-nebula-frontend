# Utilities API

Every exported function/class/constant in `src/utils/*.ts` (flat files) and the
`performance/`, `procedural/`, `stellar/`, and `threejs/` subdirectories, grouped by
concern. Functions that already have a full write-up in
[`docs/API_REFERENCE.md`](../API_REFERENCE.md) are summarized here with a link rather
than duplicated.

## Table of contents

- [Security](#security)
- [Caching & storage](#caching--storage)
- [Stellar](#stellar)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Media & assets](#media--assets)
- [Three.js](#threejs)
- [Procedural generation](#procedural-generation)
- [Validation](#validation)
- [Error messages & haptics](#error-messages--haptics)

---

## Security

### `crypto.ts`

- **`encrypt(plaintext: string, password: string): Promise<EncryptedData>`** —
  password-based encryption (Web Crypto `SubtleCrypto`) for anything stored client-side
  that shouldn't be plain text (e.g. a saved session secret).
- **`decrypt(encryptedData: EncryptedData, password: string): Promise<string>`** —
  inverse of `encrypt`; throws if the password is wrong or the data is corrupted.

```ts
const encrypted = await encrypt(sessionSecret, userPassword)
const secret = await decrypt(encrypted, userPassword)
```

Used by [`storage.ts`](#storagets)'s `saveEncryptedCopy`/`readEncryptedCopy`.

### `csrf.ts`

Lightweight double-submit-cookie style CSRF token helpers for same-origin API calls.

- **`getCsrfToken(): string | null`** — reads the current token.
- **`setCsrfToken(token: string): void`** / **`generateCsrfToken(): string`** — store /
  create a token.
- **`shouldAttachCsrf(method?: string): boolean`** — `true` for mutating methods
  (POST/PUT/PATCH/DELETE), `false` for `GET`/`HEAD`.
- **`applyCsrfHeaders(headers?: HeadersInit): Headers`** — returns `headers` with the
  CSRF header attached when `shouldAttachCsrf` applies.

```ts
const headers = applyCsrfHeaders({ 'Content-Type': 'application/json' })
fetch('/api/save', { method: 'POST', headers, body })
```

### `sanitization.ts`

Redaction helpers for anything that might reach logs/monitoring.

- **`redactWalletAddress(address: string): string`** — truncates a Stellar public key
  for display/logging (e.g. `GABC…WXYZ`).
- **`redactStellarKeysInText(text: string): string`** — finds and redacts any
  `G.../S...` strkeys embedded in a free-text string (error messages, memos).
- **`isStellarNetworkUrl(url: string | undefined): boolean`** — whether a URL points at
  a known Horizon/RPC endpoint.
- **`sanitizeMonitoringData(value: unknown, key?: string, depth?: number): unknown`** —
  recursively redacts sensitive-looking fields before sending an object to
  Sentry/analytics.

### `xss-protection.ts`

- **`sanitizeHTML(html: string): string`** — strips dangerous markup from
  HTML that must be rendered as HTML.
- **`escapeHTML(text: string): string`** — escapes `& < > " '` for safe interpolation
  into HTML text content.
- **`sanitizeURL(url: string): string`** — rejects/escapes `javascript:`/`data:`-style
  URLs before use in `href`/`src`.
- **`sanitizeContractString(contractData: unknown): string`** — escapes arbitrary
  on-chain string data (e.g. a payment memo) before rendering it — see its use in
  [`TransactionHistory`](./components.md#transactionhistory-component).
- **`sanitizeUserInput(input: string): string`** — general-purpose escaping for
  user-typed text rendered back into the UI.
- **`generateCSPMetaTag(): string`** — builds a `<meta http-equiv="Content-Security-Policy">`
  tag string from the app's policy.

```ts
<p>{sanitizeContractString(transaction.memo)}</p>
```

---

## Caching & storage

### `apiCache.ts`

HTTP-response cache that honors `Cache-Control`.

- **`class ApiCache`** (singleton exported as `apiCache`) — `get`/`set`/`invalidate`-style
  cache keyed by request path + search params.
- **`isCacheableMethod(method?: string): boolean`** — `true` for `GET`/`HEAD`.
- **`parseCacheControl(header): { directive: CacheDirective, maxAgeMs?: number, ... }`** —
  parses a `Cache-Control` header into a directive (`'store' | 'no-store' | 'no-cache' | 'private'`) plus TTL.
- **`cacheKeyFor(path: string, search?: string): string`** — builds the cache key `ApiCache` uses internally.

### `cache.ts`

- **`class SimpleCache<T>`** — small in-memory TTL cache (`get`/`set`/`has`/`clear`,
  plus `CacheStats`/`CacheOptions` for size and expiry). Used where a response just
  needs to survive a few seconds in memory, not the full `ApiCache` machinery.

```ts
const cache = new SimpleCache<ResourceAssetSnapshot>({ ttlMs: 5000 })
```

Fully documented alongside its usage context in
[API_REFERENCE.md § Storage & Cache](../API_REFERENCE.md#storage--cache).

### `storage.ts`

- **`class StorageManager`** — namespaced `localStorage` wrapper with JSON
  serialization and a configurable key prefix (`StorageOptions`). Documented in
  [API_REFERENCE.md § StorageManager](../API_REFERENCE.md#storagemanager).
- **`setSessionPassphrase(passphrase: string | null)`** / **`getSessionPassphrase(): string | null`** —
  in-memory (not persisted) holder for a session encryption passphrase.
- **`saveEncryptedCopy(prefix, key, value)`** / **`readEncryptedCopy(prefix, key)`** —
  write/read a value through [`crypto.ts`](#cryptots)'s `encrypt`/`decrypt` before it
  touches `localStorage`.

### `memoization.ts`

- **`deepEqual<T>(a: T, b: T): boolean`** — structural equality check, used where
  reference equality (`Object.is`) is too strict for a `useMemo`/`useEffect` dependency.
- **`createMemoizedObject<K, V>(...)`** — memoizes object construction by key so the
  same logical object isn't recreated (and doesn't retrigger downstream effects) every
  render.

### `stateCleanup.ts`

- **`purgeApplicationState(): void`** — clears every persisted store/cache the app
  owns; the "New game (clear data)" action in [`SettingsPanel`](./components.md#settingspanel)
  goes through `clearAllGameData` in `src/services/saveLoad`, which calls this.

---

## Stellar

Most of `src/utils/stellar/*` already has a full write-up in
[API_REFERENCE.md § Stellar Utilities](../API_REFERENCE.md#stellar-utilities); this
section summarizes each file and fills in the two that aren't covered there
(`balance.ts`'s hook, `batchTransaction.ts`).

### `retry.ts`

`isRetryableStellarError(error: unknown): boolean` and `retryAsync<T>(fn, options: RetryOptions)`.
Fully documented in [API_REFERENCE.md § Retry](../API_REFERENCE.md#retry).

### `responseParser.ts`

`parseContractResponseXdr`, `parseSimulationResponse`, `parseResponseValue`, and the
`ContractResponseParseError` class for turning Soroban XDR return values into native
TypeScript values. Fully documented in
[API_REFERENCE.md § Contract Response Parsing](../API_REFERENCE.md#contract-response-parsing).

### `simulate.ts`

`simulateContractTransaction<T>(xdr, options: SimulateContractTransactionOptions)` —
dry-runs a built transaction against the RPC server before asking the wallet to sign.
Fully documented in [API_REFERENCE.md § Simulation](../API_REFERENCE.md#simulation).

### `feeEstimation.ts`

`estimateTransactionFee`, `formatFeeInXlm`, `buildCostPreview`, and the
`MIN_TRANSACTION_FEE_STROOPS` constant. Fully documented in
[API_REFERENCE.md § Fee Estimation](../API_REFERENCE.md#fee-estimation).

### `balance.ts`

- **`formatBalance(balance: Horizon.HorizonApi.BalanceLine): FormattedBalance`** and the
  `loadCachedBalances`/`saveCachedBalances` pair — covered in
  [API_REFERENCE.md § Balance](../API_REFERENCE.md#balance).
- **`useAccountBalances(accountId: string | null)`** — _not_ covered there: this is a
  React hook (despite living in `utils/`) that streams an account's native + asset
  balances, exposing `{ balances, isLoading, error, isUnfunded, isStreaming, balanceChanged }`.
  `isStreaming`/`balanceChanged` reflect whether live updates are flowing and whether the
  balance just ticked, for a brief highlight animation.

```tsx
const { balances, isUnfunded } = useAccountBalances(walletState.publicKey)
```

Backing component: [`WalletDisplay`](./components.md#walletdisplay).

### `timeout.ts`

`withTimeout<T>(promise, ms, message)` plus the `SIGNING_TIMEOUT_MS` (60s) /
`SIGNING_TIMEOUT_MESSAGE` constants used to time out a wallet's signing prompt. Used by
[`useSignTransaction`](../API_REFERENCE.md#usesigntransaction).

### `batchTransaction.ts`

Not covered in API_REFERENCE.md. Models a sequence of dependent on-chain operations as
a single plan with fee totals and dependency validation — used by
[`UpgradeModal`](./components.md#upgrademodal) to preview a ship upgrade's multi-step
operation chain before submission.

| Export                          | Signature                                                                                                 | Purpose                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `createBatchOperation`          | `<TKind, TPayload>(input: CreateBatchOperationInput<TKind, TPayload>) => BatchOperation<TKind, TPayload>` | Builds one operation (id, kind, description, payload, `feeStroops`, optional `dependsOn`).                      |
| `validateBatchOperations`       | `(operations) => BatchTransactionValidationError[]`                                                       | Checks dependency ordering, operation count (≤ `MAX_BATCH_OPERATIONS`, 100), and duplicate ids.                 |
| `calculateBatchFee`             | `(operations, baseFeeStroops?) => number`                                                                 | Total fee for the plan (default base `DEFAULT_BATCH_BASE_FEE_STROOPS`, 100 stroops).                            |
| `buildBatchTransaction`         | `<TOperation>(operations: TOperation[]) => BatchTransactionPlan<TOperation>`                              | Produces the ordered, validated plan (`operations`, `totalOperations`, `totalFeeStroops`, `isValid`, `errors`). |
| `createBatchTransactionBuilder` | `<TOperation>(options: BatchTransactionOptions) => BatchTransactionBuilder<TOperation>`                   | Fluent builder (`replaceOperations(...).build()`) for assembling a plan incrementally.                          |

```ts
const plan = buildBatchTransaction([
  createBatchOperation({
    id: 'inspect',
    kind: 'inspect',
    description: '...',
    payload: {},
    feeStroops: 25,
  }),
  createBatchOperation({
    id: 'install',
    kind: 'install',
    description: '...',
    payload: {},
    dependsOn: ['inspect'],
    feeStroops: 40,
  }),
])
```

### `horizon-utils.ts`, `ledger-utils.ts`, `multisig-utils.ts`, `rarity.ts`, `rate-limiter.ts`, `fee-calculator.ts`

Not covered in API_REFERENCE.md.

- **`horizon-utils.ts`** — `fetchAccountTransactions`, `fetchIncrementalTransactions`,
  `getLatestTransaction`, `getTransactionById` (all `async`, wrapping Horizon's
  transactions endpoint), plus `extractNextCursor` and `parseTransactionResponse` for
  turning a raw Horizon response into the app's transaction shape.
- **`ledger-utils.ts`** — `checkLedgerSupport()`/`getLedgerDeviceInfo()` (WebUSB
  capability probing), `getNetworkPassphrase(network)`, `getDerivationPath(accountIndex?)`
  (defaults to account `0`), `validatePublicKey(publicKey)`, `isLedgerConnected()`, and
  `formatLedgerError(error)` for user-facing Ledger error text. Backs
  [`useLedger`](./hooks.md#useledgeroptions-uselegeroptions-ledgerconnectionstate--connect-disconnect-signtransaction-clearerror-checkavailability).
- **`multisig-utils.ts`** — `createMultiSigTransaction(xdr, threshold, signers)`,
  `addSignature(multiSig, signer, signature)`, `canExecuteTransaction`,
  `getRemainingSignatures`, `getSignatureProgress`, `validateSignerAddress`,
  `serializeMultiSigTransaction`/`deserializeMultiSigTransaction`. Backs
  [`useMultiSig`](./hooks.md#usemultisig-multisigstate).
- **`rarity.ts`** — `rollRarity(rng, config?)`, `rollResourceAmount(base, rarity)`,
  `getResourceRarity(resourceType)`, `getBaseScanAmount(resourceType)`,
  `getRarityColor(tier)`/`getRarityLabel(tier)` (display helpers), and
  `rollScanReward(resourceType, rng)` which combines a rarity roll with the resulting
  amount. Drives the loot roll in [`NebulaCanvas`](./components.md#nebulacanvas)'s scan
  handler, and the badge colors on [`InteractiveScanPoint`](./components.md#interactivescanpoint--interactivescanpoints).
- **`rate-limiter.ts`** — `class RateLimiter` (token bucket: `{ capacity, refillPerSecond }`,
  `tryAcquire(): RateLimitResult`) and `class RateLimitError extends Error`. Backs
  [`useRateLimitedRequest`](./hooks.md#useratelimitedrequesttargs-tresultrequest-options).
- **`fee-calculator.ts`** — `calculateFeeBreakdown(transaction): FeeBreakdown`,
  `getDetailedFeeEstimate(transaction, networkRate): DetailedFeeEstimate`,
  `convertStroopsToLumens`/`convertLumensToStroops`, `formatFeeInLumens(stroops, decimalPlaces?)`
  (default 7 decimals), `estimateTransactionFee(...)`, and `isPricyTransaction(transaction)`
  (flags transactions worth a "high fee" warning). Backs
  [`useFeeEstimation`](./hooks.md#usefeeestimationtransaction-transaction--null-options-usefeeestimationoptions-feeestimationstate--estimatefee-clearerror)
  and the root [`TransactionPreview`](./components.md#transactionpreview-root).

```ts
const breakdown = calculateFeeBreakdown(transaction)
if (isPricyTransaction(transaction)) showHighFeeWarning()
```

---

## Accessibility

### `contrast-checker.ts`

WCAG contrast-ratio math, independent of any specific component.

| Export              | Signature                                                     | Purpose                                                          |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `relativeLuminance` | `(color: RgbColor) => number`                                 | WCAG relative luminance of a color.                              |
| `contrastRatio`     | `(a: RgbColor, b: RgbColor) => number`                        | Contrast ratio between two colors.                               |
| `requiredRatio`     | `(level: 'AA' \| 'AAA', size: 'normal' \| 'large') => number` | The minimum ratio WCAG requires for that level/size combination. |
| `checkContrast`     | `(foreground, background) => ContrastResult`                  | Ratio + pass/fail against AA and AAA.                            |
| `parseHex`          | `(hex: string) => RgbColor \| null`                           | Parses a `#rrggbb` string.                                       |
| `checkHexContrast`  | `(fgHex, bgHex) => ContrastResult`                            | `checkContrast` taking hex strings directly.                     |

```ts
const result = checkHexContrast('#f8fbff', '#07111f')
if (!result.passesAA) flagLowContrast()
```

### `focus-management.ts`

- **`getFocusableElements(container: HTMLElement): HTMLElement[]`** — every element
  inside `container` that's a real Tab stop (used by the lower-level logic in
  [`useFocusTrap`](./hooks.md#usefocustraptoptions-focustrapoptions-reactrefobjectt--null)).
- **`focusFirst(container)`** / **`focusLast(container)`** — focus the first/last
  focusable element inside a container.
- **`announceToScreenReader(message: string, delay = 100): void`** — pushes a message
  into a live region for assistive-tech announcement, after a short delay (so the DOM
  update is picked up reliably by screen readers).

---

## Performance

### `performance.ts`

- **`isTabVisible(): boolean`** — current Page Visibility state.
- **`onVisibilityChange(onVisible?, onHidden?): () => void`** — subscribes to
  visibility changes; returns an unsubscribe function.
- **`getBatteryStatus(): Promise<BatteryManager | null>`** — Battery Status API, where
  supported (most browsers have deprecated it; expect `null` often).
- **`getRecommendedFrameloop(...): 'always' | 'demand' | 'never'`** — suggests a
  React Three Fiber `frameloop` setting based on visibility/battery/performance hints.

### `three-performance.ts`

- **`isMobileDevice(): boolean`** / **`isLowEndDevice(): boolean`** — device
  heuristics (pointer type, screen size, `navigator.userAgentData`, core count).
- **`calculateAdaptiveParticleCount(...)`** — scales a particle budget down on weaker
  devices.
- **`getQualityPreset(quality: GraphicsQuality, isMobile: boolean): QualityPreset`** —
  resolves a named quality level (`low`/`medium`/`high`) plus device hints into concrete
  renderer settings (antialias, pixel ratio cap, bloom/DOF on/off, power preference,
  precision). Drives the `<Canvas>` setup in
  [`NebulaCanvas`](./components.md#nebulacanvas).
- **`createPerformanceMonitor(...)`** — factory for a lightweight FPS/frame-time sampler
  (distinct from [`useFrameRateMonitor`](./hooks.md#useframeratemonitoroptions--fps-averagefps-samplecount-iswithintarget),
  which is the React-hook form).
- `TARGET_FPS` — shared FPS targets used across the quality presets.

```ts
const preset = getQualityPreset(graphicsQuality, isMobileDevice())
<Canvas gl={{ antialias: preset.antialias, powerPreference: preset.powerPreference }} dpr={preset.maxPixelRatio} />
```

### `performance/fpsBenchmark.ts`

- **`calculateFps(frameCount: number, elapsedMs: number): number`** — the raw FPS
  arithmetic shared by every FPS-sampling hook/util.
- **`createFpsBenchmark(options?: FpsBenchmarkOptions)`** — a non-hook FPS sampler for
  use in tests/scripts (see `test/performance/fps.test.ts`).

### `performance/memoryLeakTracker.ts`

- **`createResourceTracker()`** — tracks registered Three.js resources (geometries,
  materials, textures) by `ManagedResourceType` and asserts they were disposed; backs
  [`useRenderResourceTracker`](./hooks.md#userenderresourcetracker-resourcetracker) and
  the dedicated memory-leak test suite (`test/performance/memory.test.ts`).

---

## Media & assets

### `image-optimization.ts`

- **`generateSrcSet(imagePath, sizes: number[]): string`** — builds a `srcset` attribute
  value for a set of widths.
- **`supportsWebP(): Promise<boolean>`** / **`getOptimizedImageUrl(imagePath): Promise<string>`** —
  WebP capability detection and URL resolution.
- **`lazyLoadImage(img: HTMLImageElement): void`** — swaps `data-src`/`data-srcset` into
  `src`/`srcset` once the element is near the viewport (used by
  [`OptimizedImage`](./components.md#image--optimizedimage)).
- **`preloadImage(src): void`** / **`compressImageUrl(...)`** / **`generateBlurPlaceholder(width?, height?)`**
  (defaults `10×10`) / **`calculateOptimalImageSize(containerWidth): number`**.

### `preload.ts`

- **`preloadAsset(...)`** / **`preloadImage(src): Promise<void>`** / **`preloadFont(...)`** —
  resource-hint helpers (`<link rel="preload">` equivalents done programmatically).
- **`CRITICAL_ASSETS`** — the fixed list of assets the app always wants warmed.
- **`preloadCriticalAssets(): void`** — preloads everything in `CRITICAL_ASSETS`; called
  once at startup.

### `sri.ts`

Subresource Integrity helpers for third-party `<script>` tags.

- **`generateSRIHash(content: string | ArrayBuffer): Promise<string>`** —
  computes a `sha384-...` hash for a script's contents (see `scripts/generate-sri.mjs`,
  which uses this to populate `SRI_RESOURCES`).
- **`verifySRI(...)`** — checks a loaded resource's hash against the expected one.
- **`SRI_RESOURCES: Record<string, SRIResource>`** — the known set of third-party
  scripts and their pinned hashes.
- **`loadScriptWithSRI(...)`** — injects a `<script>` tag with an `integrity` attribute.
- **`isSRISupported(): boolean`** — feature-detects browser SRI support.
- **`reportSRIFailure(resource, event): void`** — reports an integrity-check failure to
  monitoring (a script was tampered with or the pinned hash is stale).

---

## Three.js

### `three-cleanup.ts`

Shared disposal helpers for everything a `useThreeScene`/`useThreeJsCleanup` lifecycle
needs to tear down.

| Export                            | Purpose                                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disposeTexture(texture?)`        | Disposes a single texture.                                                                                                                                              |
| `disposeGeometry(geometry?)`      | Disposes a single geometry.                                                                                                                                             |
| `disposeMaterial(material?)`      | Disposes one material or an array of materials, including any textures it references.                                                                                   |
| `disposeHierarchy(root?)`         | Recursively disposes every geometry/material/texture under an `Object3D`.                                                                                               |
| `disposeWebGLRenderer(renderer?)` | Disposes the renderer itself and loses its GL context.                                                                                                                  |
| `cleanScene(scene, renderer)`     | The full teardown: `disposeHierarchy(scene)` + `disposeWebGLRenderer(renderer)`. Used by `CanvasResourceCleanup` inside [`NebulaCanvas`](./components.md#nebulacanvas). |

Backs [`useThreeScene`](./hooks.md#usethreesceneoptions-usethreesceneoptions).

### `threejs/cleanup.ts`

- **`disposeThreeObject(obj: THREE.Object3D)`** — single-object disposal (lighter-weight
  cousin of `disposeHierarchy` above).
- **`useThreeJsCleanup({ objects, materials, textures, renderer }: ThreeJsCleanupProps)`** —
  a hook (despite living under `utils/`) that disposes a fixed list of resources on
  unmount; prefer [`useThreeScene`](./hooks.md#usethreesceneoptions-usethreesceneoptions)
  for new code, which manages the list for you via `registerDisposable`.

### `threejs/lod.ts`

- **`useThreeJsLod({ lowDetailDistance, mediumDetailDistance, highDetailDistance, maxParticles, minParticles }: LodConfig): number`** —
  returns a particle-count budget that scales with camera distance (used by
  [`ParticleSystem`](./components.md#particlesystem--starfield--proceduralnebulafield)
  to keep far-away nebula clouds cheap to render).

### `threejs/webgl-support.ts`

- **`detectWebGlSupport(): boolean`** — one-shot capability check.
- **`useWebGlSupport(): boolean`** — the hook form, used by
  [`WebGlFallback`](./components.md#canvas--3d-nebula-view) to show a fallback message
  instead of a blank canvas on unsupported devices.

---

## Procedural generation

### `procedural/nebula.ts`

Deterministic, seeded nebula particle-field generator — the same seed always produces
the same field, so a nebula's layout is reproducible from a short string.

| Export                   | Signature                                    | Purpose                                                                                                                                                                                                                  |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createRNG`              | `(seed: number) => () => number`             | Seeded pseudo-random number generator.                                                                                                                                                                                   |
| `hashToSeed`             | `(hash: string) => number`                   | Turns an arbitrary string (e.g. a transaction hash) into a numeric seed.                                                                                                                                                 |
| `subSeed`                | `(rng: () => number) => number`              | Derives a child seed from a parent RNG, for independent sub-generators.                                                                                                                                                  |
| `createPermutation`      | `(seed: number) => Uint8Array`               | Permutation table for Perlin-style noise.                                                                                                                                                                                |
| `fbm2D` / `fbm3D`        | `(x, y, [z], octaves, perm) => number`       | Fractal Brownian motion noise (2D/3D), the base texture for nebula density.                                                                                                                                              |
| `generateNebulaGeometry` | `(config: NebulaConfig) => NebulaGeometry`   | Full geometry (positions/colors/sizes/opacities as typed arrays) for a given config — what [`useProceduralNebula`](./hooks.md#useproceduralnebulaconfig-nebulaconfig--null--geometry-isloading) calls inside its worker. |
| `generateNebula`         | `(config: NebulaConfig) => NebulaParticle[]` | Same generation as an array of particle objects, for callers that want structured data instead of flat typed arrays.                                                                                                     |

`NebulaConfig` is `{ seed, pattern: NebulaPattern, particleCount, radius }`, where
`NebulaPattern` is one of `'spiral' | 'ring' | 'cluster' | 'filament' | 'core'`.

```ts
const rng = createRNG(hashToSeed(lastLedgerTransactionHash))
const geometry = generateNebulaGeometry({
  seed: rng(),
  pattern: 'spiral',
  particleCount: 20000,
  radius: 10,
})
```

This is CPU-heavy at high particle counts, which is why
[`useProceduralNebula`](./hooks.md#useproceduralnebulaconfig-nebulaconfig--null--geometry-isloading)
runs it in a Web Worker rather than calling it directly from a component.

---

## Validation

### `validation.ts`

Composable field-level validator rules, consumed by
[`useFormValidation`](./hooks.md#useformvalidationvalues-initialvalues-schema-options-useformvalidationreturnvalues)
and used directly by [`TradeForm`](./components.md#dexinterface--orderbook--tradeform--tradehistory).

| Export           | Signature                                                                                     | Purpose                                                             |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `required`       | `(message) => ValidationRule`                                                                 | Non-empty check.                                                    |
| `isNumber`       | `(message) => ValidationRule`                                                                 | Must parse as a number.                                             |
| `positive`       | `(message) => ValidationRule`                                                                 | Must be `> 0`.                                                      |
| `min` / `max`    | `(bound, message) => ValidationRule`                                                          | Numeric bounds.                                                     |
| `maxDecimals`    | `(places, message) => ValidationRule`                                                         | Caps decimal precision (e.g. 7 for stroop-denominated amounts).     |
| `maxLength`      | `(length, message) => ValidationRule`                                                         | String length cap.                                                  |
| `pattern`        | `(regex, message) => ValidationRule`                                                          | Regex match.                                                        |
| `runRules`       | `<T>(value, rules: ValidationRule<T>[], allValues) => string \| undefined`                    | Runs a field's rules in order, returning the first failure message. |
| `validateValues` | `<Values>(values, schema: ValidationSchema<Values>) => Partial<Record<keyof Values, string>>` | Runs every field's rules; returns an error map.                     |

Also exports a small prop-shape runtime-checking toolkit used in dev builds to catch
malformed props early: `isString`, `isBoolean`, `isFiniteNumber`, `isRecord`,
`optionalProp`, `arrayOf`, `findInvalidProps`, `reportInvalidProps` (the latter two back
[`OrderBook`](./components.md#dexinterface--orderbook--tradeform--tradehistory)'s
runtime prop validation).

```ts
const schema = {
  amount: [required('Enter an amount'), isNumber('Must be a number'), positive('Must be positive')],
}
const errors = validateValues(values, schema)
```

---

## Error messages & haptics

### `error-messages.ts`

- **`getErrorMessage(error: unknown, fallback: string): string`** — the app-wide
  "turn any thrown value into a displayable string" helper; used throughout the hooks
  and components reference above wherever you see `getErrorMessage(err, '...')`.
- **`describeError(error: unknown): string`** — verbose technical description (stack,
  name, message where available) — used only in development-mode error details (see
  [`ErrorDisplay`](./components.md#errordisplay)).
- **`toFriendlyError(error: unknown): FriendlyError`** — maps an error to
  `{ title, message, action }` copy suitable to show a player directly.

### `haptics.ts`

- **`haptics`** — an object of named vibration patterns (`haptics.light()`,
  `haptics.error()`, `haptics.scanStarted()`, `haptics.scanSuccess()`,
  `haptics.upgradeStart()`, `haptics.upgradeSuccess()`, `haptics.warning()`, etc.), each
  calling `navigator.vibrate` with a tuned `HapticPattern` (a number or number array) —
  no-ops silently on devices without vibration support.
- **`triggerScanHaptic()` / `triggerUpgradeHaptic()` / `triggerErrorHaptic()`** —
  standalone functions for the same three common patterns, for call sites that don't
  want the full `haptics` object.

```ts
haptics.scanStarted()
// ...
haptics.scanSuccess()
```
