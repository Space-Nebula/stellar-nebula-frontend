# Hooks API

Every custom hook in `src/hooks/*.ts` and `src/hooks/contracts/*.ts`, plus the small set
of component-local hooks that are only ever used by one component. Hooks that already
have a full write-up in [`docs/API_REFERENCE.md`](../API_REFERENCE.md) are summarized here
with a link to the fuller entry rather than duplicated.

## Table of contents

- [Wallet, signing & contracts](#wallet-signing--contracts)
- [UI & interaction](#ui--interaction)
- [Accessibility](#accessibility)
- [Performance & rendering](#performance--rendering)
- [Networking & data](#networking--data)
- [Persistence & session](#persistence--session)
- [Component-local hooks](#component-local-hooks)

---

## Wallet, signing & contracts

### `useFreighterWallet()`

Connect/disconnect the Freighter browser extension and sign transactions. Fully
documented in [API_REFERENCE.md § useFreighterWallet](../API_REFERENCE.md#usefreighterwallet).

### `useSignTransaction()`

Builds, simulates, signs (via the active wallet), submits, and polls a transaction in one
call. Fully documented in [API_REFERENCE.md § useSignTransaction](../API_REFERENCE.md#usesigntransaction).

### `useLedger(options?: UseLedgerOptions): LedgerConnectionState & { connect, disconnect, signTransaction, clearError, checkAvailability }`

`src/hooks/useLedger.ts`. Connects to a Ledger hardware wallet over WebUSB and signs
Stellar transactions with it.

| Option                 | Type             | Default     | Purpose                                                                                                     |
| ---------------------- | ---------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `network`              | `StellarNetwork` | `'testnet'` | Which network passphrase to sign with.                                                                      |
| `requiresConfirmation` | `boolean`        | `false`     | Reserved for callers that want an extra confirmation step before signing (not enforced by the hook itself). |

Returns `{ isConnected, publicKey, isLoading, error, connect, disconnect, signTransaction, clearError, checkAvailability }`.
`checkAvailability()` runs automatically on mount and is also exposed for manual re-checks.

```tsx
const ledger = useLedger({ network: 'testnet' })

async function onConnectClick() {
  if (!(await ledger.checkAvailability())) return
  await ledger.connect()
}
```

### `useMultiSig(): MultiSigState`

`src/hooks/useMultiSig.ts`. Local, client-side workflow for assembling a multi-signature
transaction: start from an XDR + threshold + signer list, collect signatures one at a
time, and export/import the in-progress bundle as JSON.

Returns:

| Field                                            | Type                                      | Purpose                                                      |
| ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| `transaction`                                    | `MultiSigTransaction \| null`             | The in-progress bundle.                                      |
| `error`                                          | `string \| null`                          | Last validation/operation error.                             |
| `initializeTransaction(xdr, threshold, signers)` | `function`                                | Starts a new bundle; validates every signer address first.   |
| `addSignature(signer, signature)`                | `function`                                | Appends a collected signature.                               |
| `isReady()`                                      | `() => boolean`                           | Whether the threshold has been met.                          |
| `getProgress()`                                  | `() => { current, required, percentage }` | Signature-collection progress.                               |
| `getRemainingCount()`                            | `() => number`                            | Signatures still needed.                                     |
| `exportTransaction()`                            | `() => string \| null`                    | Serializes the bundle for handoff (e.g. download as a file). |
| `importTransaction(serialized)`                  | `function`                                | Loads a bundle exported elsewhere.                           |
| `resetTransaction()`                             | `function`                                | Clears the current bundle.                                   |

```tsx
const multiSig = useMultiSig()
multiSig.initializeTransaction(xdr, 2, [signerA, signerB, signerC])
multiSig.addSignature(signerA, signatureFromSignerA)
if (multiSig.isReady()) {
  const payload = multiSig.exportTransaction()
}
```

Backing component: [`MultiSigBuilder`](./components.md#multisigbuilder).

### `useFeeEstimation(transaction: Transaction | null, options?: UseFeeEstimationOptions): FeeEstimationState & { estimateFee, clearError }`

`src/hooks/useFeeEstimation.ts`. Computes a per-operation fee breakdown for a built
(unsigned) transaction via `calculateFeeBreakdown` / `getDetailedFeeEstimate`
(see [utils § Stellar fee helpers](./utils.md#fee-calculatorts)).

| Option         | Type      | Default    | Purpose                                                   |
| -------------- | --------- | ---------- | --------------------------------------------------------- |
| `networkRate`  | `number`  | `BASE_FEE` | Per-operation base fee to estimate against.               |
| `autoEstimate` | `boolean` | `true`     | Re-estimate automatically whenever `transaction` changes. |

Returns `{ estimate, isLoading, error, estimateFee, clearError }` — `estimate` is a
`DetailedFeeEstimate` with human-readable XLM amounts once available.

```tsx
const { estimate, isLoading } = useFeeEstimation(builtTransaction)
```

Backing component: the root-level [`TransactionPreview`](./components.md#transactionpreview-root).

### `useNebulaScan(options: UseNebulaScanOptions): UseNebulaScanReturn`

`src/hooks/contracts/useNebulaScan.ts`. Fully documented in
[API_REFERENCE.md § useNebulaScan](../API_REFERENCE.md#usenebulascan). Scans a nebula
zone via the `scan_nebula` Soroban contract call: build → simulate → sign → submit, with
haptic feedback on success/failure.

### `useShipUpgrade(shipId, accountId?, config?): UseShipUpgradeResult`

`src/hooks/contracts/useShipUpgrade.ts`. Fully documented in
[API_REFERENCE.md § useShipUpgrade](../API_REFERENCE.md#useshipupgrade). Manages the full
ship-upgrade lifecycle: fetches the ship NFT and resource balances, computes an upgrade
quote (`refresh()`), builds and simulates the upgrade transaction
(`buildUpgradeTransaction()`), and builds + signs + submits + polls it
(`executeUpgrade()`).

```tsx
const { shipNFT, quote, isLoading, executeUpgrade } = useShipUpgrade(activeShip?.id)
```

Both are re-exported from the barrel `src/hooks/contracts/index.ts`.

---

## UI & interaction

### `useCombobox<T>(options: UseComboboxOptions<T>): UseComboboxReturn<T>`

`src/hooks/useCombobox.ts`. Headless implementation of the WAI-ARIA 1.2 combobox
(listbox) pattern: open/close state, active-descendant tracking, typeahead search, and
full keyboard navigation (arrows, Home/End, PageUp/Down, Enter/Space, Escape, Tab).

| Option                   | Type                      | Default               | Purpose                                      |
| ------------------------ | ------------------------- | --------------------- | -------------------------------------------- |
| `id`                     | `string`                  | generated via `useId` | Base id for the combobox/listbox/label trio. |
| `options`                | `ComboboxOption<T>[]`     | —                     | The selectable items.                        |
| `value` / `defaultValue` | `T`                       | —                     | Controlled or uncontrolled selected value.   |
| `onChange`               | `(value, option) => void` | —                     | Fired on selection.                          |
| `disabled`               | `boolean`                 | `false`               | Disables the whole control.                  |
| `loop`                   | `boolean`                 | `true`                | Whether arrow-key navigation wraps around.   |

Returns prop-getter functions (`getComboboxProps`, `getListboxProps`, `getOptionProps`,
`getLabelProps`) plus the raw state (`isOpen`, `selectedOption`, `activeIndex`,
`announcement` for screen readers, etc.) so any markup can implement the pattern.

```tsx
const combobox = useCombobox({
  options: [{ value: 'testnet', label: 'Testnet' }, { value: 'mainnet', label: 'Mainnet' }],
  value: network,
  onChange: (value) => setNetwork(value),
})

<label {...combobox.getLabelProps()}>Network</label>
<button {...combobox.getComboboxProps()}>{combobox.selectedOption?.label}</button>
<ul {...combobox.getListboxProps()}>
  {options.map((opt, i) => <li key={opt.value} {...combobox.getOptionProps(i)}>{opt.label}</li>)}
</ul>
```

Backing component: the `Select` primitive documented in
[COMPONENTS.md § Custom Select Component](../COMPONENTS.md#1-custom-select-component-wai-aria-12-combobox).

### `useFormValidation<Values>(initialValues, schema, options?): UseFormValidationReturn<Values>`

`src/hooks/useFormValidation.ts`. Headless, per-field real-time validation: tracks
`values`/`errors`/`touched`, validates a field once it's been blurred (or on every
change with `validateOnChange: true`), and exposes `validateAll()` for submit-time checks.

| Param                      | Type                                | Purpose                                                         |
| -------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `initialValues`            | `Values` (`Record<string, string>`) | Starting form state.                                            |
| `schema`                   | `ValidationSchema<Values>`          | Map of field name → [validator rules](./utils.md#validationts). |
| `options.validateOnChange` | `boolean` (default `false`)         | Validate on every keystroke instead of only after blur.         |

Returns `{ values, errors, touched, isValid, handleChange, handleBlur, setValue, validateAll, reset }`.

```tsx
const { values, errors, touched, handleChange, handleBlur, validateAll } = useFormValidation(
  { price: '', amount: '' },
  { price: [required('Enter a price'), isNumber('Must be a number')] }
)
```

Used by [`TradeForm`](./components.md#tradeform).

### `useFormAccessibility(): FormFieldIds`

`src/hooks/useFormAccessibility.ts`. Generates a stable, unique set of ids (`inputId`,
`labelId`, `errorId`, `hintId`) via React's `useId`, for wiring `<label htmlFor>`,
`aria-describedby`, and `aria-invalid` consistently on a single form field.

```tsx
const ids = useFormAccessibility()

<label htmlFor={ids.labelId}>Email</label>
<input id={ids.inputId} aria-describedby={error ? ids.errorId : undefined} aria-invalid={!!error} />
{error && <p id={ids.errorId} role="alert">{error}</p>}
```

### `useFocusTrap<T>(options: FocusTrapOptions): React.RefObject<T | null>`

`src/hooks/useFocusTrap.ts`. Shared focus-trap implementation for custom dialogs (every
hand-rolled modal in the app uses this instead of re-implementing the same logic):
moves focus in on open, cycles Tab/Shift+Tab within the container, restores focus to
whatever was focused before on close, and optionally locks page scroll.

| Option       | Type         | Default | Purpose                                                                                                          |
| ------------ | ------------ | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `active`     | `boolean`    | —       | Whether the trap is currently engaged.                                                                           |
| `onEscape`   | `() => void` | —       | Called on Escape; leave unset for a native `<dialog>` opened with `showModal()`, which already dismisses itself. |
| `lockScroll` | `boolean`    | `true`  | Locks `<body>` scroll while active.                                                                              |

Returns a ref to attach to the dialog container.

```tsx
const dialogRef = useFocusTrap<HTMLDivElement>({ active: isOpen, onEscape: onClose })
<div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}>...</div>
```

Used by [`Modal`](./components.md#modal), [`HelpModal`](./components.md#helpmodal), and
others that aren't built on the native `<dialog>` element.

### `useTouchGestures(targetRef, callbacks: TouchGestureCallbacks): void`

`src/hooks/useTouchGestures.ts`. Fully documented in
[API_REFERENCE.md § useTouchGestures](../API_REFERENCE.md#usetouchgestures). Attaches
pinch-zoom, swipe-rotate, two-finger-pan, and tap handlers to a target element; used by
[`CameraControls`](./components.md#cameracontrols) to drive the nebula canvas on touch
devices.

### `useNebulaZoom(controlsRef: RefObject<OrbitControlsImpl>)`

`src/hooks/useNebulaZoom.ts`. Fully documented in
[API_REFERENCE.md § useNebulaZoom](../API_REFERENCE.md#usenebulazoom). Drives preset
camera-distance "zoom levels" (overview/exploration/detail) on an `OrbitControls`
instance; used by [`CameraControls`](./components.md#cameracontrols) for the `1`/`2`/`3`
keyboard shortcuts.

### `useLanguage(): UseLanguageReturn`

`src/hooks/useLanguage.ts`. Manages the active UI language: detects it from
`localStorage` or `navigator.language` on first load, persists changes, and keeps
`document.documentElement`'s `lang`/`dir` attributes in sync for screen readers.

Returns `{ language, setLanguage, supportedLanguages, dir, isSupported }`. Supported
codes: `en`, `es`, `fr`, `de`, `ja`, `zh` (all left-to-right today).

```tsx
const { language, setLanguage, supportedLanguages } = useLanguage()
<select value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguageCode)}>
  {supportedLanguages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
</select>
```

### `useReducedMotion(): UseReducedMotionReturn`

`src/hooks/useReducedMotion.ts`. Combines the OS/browser `prefers-reduced-motion`
media query with a manual user override and an explicit pause/resume control (WCAG 2.1
SC 2.2.2 and SC 2.3.3), synchronized across every hook instance in the tab (and across
tabs via the `storage` event).

Returns `{ prefersReducedMotion, systemPrefersReducedMotion, userOverride, isPaused,
isManuallyPaused, setReducedMotion, toggleReducedMotion, pauseAnimations,
resumeAnimations, togglePause }`.

```tsx
const { isPaused, togglePause } = useReducedMotion()
<button aria-pressed={isPaused} onClick={togglePause}>{isPaused ? 'Resume' : 'Pause'} animations</button>
```

Backing component: [`MotionToggle`](./components.md#motiontoggle). Also consumed
directly by [`NebulaCanvas`](./components.md#nebulacanvas) to drive its render loop.

---

## Accessibility

See also [`useFocusTrap`](#usefocustrap-coptions-focustrapoptions-reactrefobjectt--null)
and [`useFormAccessibility`](#useformaccessibility-formfieldids) above, and
[`focus-management.ts`](./utils.md#focus-managementts) / [`contrast-checker.ts`](./utils.md#contrast-checkerts)
in the utilities reference.

---

## Performance & rendering

### `useAnimationFrame(callback, options?): { isPaused, pause, resume }` / `usePageVisibility(): boolean`

`src/hooks/useAnimationFrame.ts`. `usePageVisibility` tracks the Page Visibility API as a
boolean. `useAnimationFrame` wraps `requestAnimationFrame` with automatic pausing when
the tab is hidden (via `usePageVisibility`), an optional manual pause/resume, and an
optional FPS cap.

| Option            | Type      | Default | Purpose                                   |
| ----------------- | --------- | ------- | ----------------------------------------- |
| `enabled`         | `boolean` | `true`  | Master on/off switch.                     |
| `pauseWhenHidden` | `boolean` | `true`  | Auto-pause while the tab is backgrounded. |
| `fpsLimit`        | `number`  | —       | Caps the callback's invocation rate.      |

```tsx
const { isPaused, pause, resume } = useAnimationFrame(
  ({ delta }) => {
    updateSimulation(delta)
  },
  { fpsLimit: 30 }
)
```

### `useFrameRateMonitor(options?): { fps, averageFps, sampleCount, isWithinTarget }`

`src/hooks/useFrameRateMonitor.ts`. Samples real frame rate over a rolling window via
`requestAnimationFrame`, pausing while the tab is hidden.

| Option           | Type                                   | Default |
| ---------------- | -------------------------------------- | ------- |
| `enabled`        | `boolean`                              | `true`  |
| `targetFps`      | `number`                               | `60`    |
| `sampleWindowMs` | `number`                               | `1000`  |
| `onSample`       | `(sample: FpsBenchmarkSample) => void` | —       |

Also summarized in [API_REFERENCE.md § useFrameRateMonitor](../API_REFERENCE.md#useframeratemonitor).
Feeds [`useAdaptivePerformanceMode`](#useadaptiveperformancemode-void) and
[`PerformanceMonitor`](./components.md#performancemonitor).

### `useAdaptivePerformanceMode(): void`

`src/hooks/useAdaptivePerformanceMode.ts`. Watches `useFrameRateMonitor` and flips the
graphics store into performance mode (fewer particles, simpler shading) after 3
consecutive low-FPS samples. One-directional by design — turning performance mode back
off is left to the user in Settings, to avoid visible thrashing. No params, no return
value; call it once near the top of the canvas tree.

```tsx
function NebulaCanvas() {
  useAdaptivePerformanceMode()
  // ...
}
```

### `useRenderResourceTracker(): ResourceTracker`

`src/hooks/useRenderResourceTracker.ts`. Fully documented in
[API_REFERENCE.md § useRenderResourceTracker](../API_REFERENCE.md#userenderresourcetracker).
Creates a Three.js resource tracker (for detecting leaked geometries/materials/textures)
and disposes it automatically on unmount.

### `useThreeScene(options?: UseThreeSceneOptions)`

`src/hooks/useThreeScene.ts`. Manages a Three.js `Scene`/`Camera`/optional `WebGLRenderer`
lifecycle with guaranteed cleanup on unmount (geometries, materials, textures, and the
renderer itself).

| Option           | Type                     | Purpose                                                                             |
| ---------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `camera`         | `THREE.Camera`           | Use a custom camera instead of the default perspective camera.                      |
| `containerRef`   | `RefObject<HTMLElement>` | Required with `createRenderer` — the DOM node the renderer's canvas is appended to. |
| `createRenderer` | `boolean`                | Whether to create and mount a `WebGLRenderer`.                                      |
| `antialias`      | `boolean`                | Passed through to the renderer.                                                     |

Returns `{ scene, camera, renderer, getRenderer, registerDisposable, disposeGeometry,
disposeMaterial, disposeTexture, disposeHierarchy, disposeRenderer }`. `registerDisposable`
tracks any extra resource so it's cleaned up alongside the scene.

```tsx
const { scene, registerDisposable } = useThreeScene()
const geometry = registerDisposable(new THREE.BoxGeometry())
```

### `useProceduralNebula(config: NebulaConfig | null): { geometry, isLoading }`

`src/hooks/useProceduralNebula.ts`. Generates nebula particle geometry (see
[`procedural/nebula.ts`](./utils.md#proceduralnebulats)) off the main thread via a Web
Worker (through [`useWorker`](#useworkertrequest-tresponsecreateworker---worker-useworkerresulttrequest-tresponse)),
falling back to synchronous main-thread computation if `Worker` is unavailable or the
worker itself fails.

```tsx
const { geometry, isLoading } = useProceduralNebula({
  seed: 42,
  pattern: 'spiral',
  particleCount: 20000,
  radius: 10,
})
```

Backing component: [`ProceduralNebulaField`](./components.md#proceduralnebulafield).

### `useWorker<TRequest, TResponse>(createWorker: () => Worker): UseWorkerResult<TRequest, TResponse>`

`src/hooks/useWorker.ts`. Generic request/response bridge to a Web Worker: creates the
worker lazily on first `run()`, correlates concurrent requests by an auto-incrementing
id (so out-of-order responses resolve the right caller), and terminates the worker on
unmount.

```tsx
const { run } = useWorker<NebulaWorkerRequest, NebulaWorkerResponse>(
  () => new Worker(new URL('../workers/nebula-worker.ts', import.meta.url), { type: 'module' })
)
const response = await run({ config })
```

> The `new URL(...)` call must be written inline at the call site (not passed as a
> variable) — Vite resolves worker URLs statically at build time.

---

## Networking & data

### `useTransactionHistory(accountId, network, options?): UseTransactionHistoryReturn`

`src/hooks/useTransactionHistory.ts`. Syncs an account's transaction history from
Horizon into `localStorage`-backed state, with filtering, free-text search, pagination,
and an optional periodic re-sync.

| Param                    | Type                             | Purpose                                      |
| ------------------------ | -------------------------------- | -------------------------------------------- |
| `accountId`              | `string \| null`                 | Stellar public key. `null` clears the list.  |
| `network`                | `string`                         | Network name, used as part of the cache key. |
| `options.autoSync`       | `boolean` (default `true`)       | Sync once automatically on mount.            |
| `options.syncIntervalMs` | `number` (default `0`, disabled) | Re-sync on an interval.                      |
| `options.config`         | `StellarNetworkConfig`           | Network config override.                     |

Returns transactions/`filteredTransactions`, `isLoading`, `isInitialized`, `error`,
`lastSyncedAt`, `hasMore`, `stats` (`total`, `successful`, `failed`, `totalFees`,
`averageFee`), `currentFilter`, and `sync` / `loadMore` / `setFilter` / `search` /
`clearHistory` / `getByHash`.

```tsx
const { transactions, isLoading, sync, search } = useTransactionHistory(publicKey, 'testnet')
```

> Note: this is a different data source from [`TransactionHistory`](./components.md#transactionhistory-component)
> (the component), which fetches directly from Horizon via `getTransactionHistory`
> without this hook's local persistence layer.

### `useTransactionRetry<TPayload>(options: TransactionRetryOptions): UseTransactionRetryReturn<TPayload>`

`src/hooks/useTransactionRetry.ts`. Wraps a transaction submission in exponential-backoff
retry with a hard attempt cap, preserving the original payload so a "Retry" button can
re-submit the exact same transaction without the user re-entering the form.

| Option                          | Type                                     | Default                   | Purpose                                             |
| ------------------------------- | ---------------------------------------- | ------------------------- | --------------------------------------------------- |
| `submit`                        | `(payload, attempt) => Promise<unknown>` | —                         | The operation to retry.                             |
| `maxAttempts`                   | `number`                                 | `3`                       | Hard cap on attempts.                               |
| `baseDelayMs`                   | `number`                                 | `750`                     | Backoff base (doubles each attempt, capped at 30s). |
| `shouldRetry`                   | `(error) => boolean`                     | `isRetryableStellarError` | Whether a given failure is worth retrying.          |
| `getTransactionId` / `getLabel` | `(payload) => string`                    | —                         | Derive an id/label for display.                     |

Returns `{ lastFailure, attempt, isRetrying, retry, clear, recordFailure }`.

```tsx
const tx = useTransactionRetry({
  maxAttempts: 3,
  submit: (payload) => rpcServer.sendTransaction(payload),
})
tx.recordFailure(payload, error)
await tx.retry()
```

### `useTransactionRecovery<TPayload>(options: UseTransactionRecoveryOptions): TransactionRecovery`

`src/hooks/useTransactionRecovery.ts`. Builds on `useTransactionRetry` to connect a failed
optimistic game-store operation to a user-facing recovery surface: retry, dismiss, or
roll back the optimistic change entirely (releasing whatever cooldown/resource it held).
Also fires analytics (`transaction_retry_succeeded` / `_failed` / `transaction_rolled_back`).

Returns `{ hasFailure, error, attempt, isRetrying, retry, dismiss, rollback }`.

```tsx
const recovery = useTransactionRecovery({ submit: (payload, attempt) => scanContract(payload) })
```

Rendered via [`TransactionRecoveryPanel`](./components.md#transactionrecoverypanel).

### `useWebSocketStatus(manager?: WebSocketManager): UseWebSocketStatusReturn`

`src/hooks/useWebSocketStatus.ts`. Subscribes to a `WebSocketManager`'s connection state
(open/connecting/reconnecting/error/closed), reconnect attempt count, retry countdown,
and queued-message count for replay.

Returns `{ ...ConnectionStatusDetails, isConnected, isReconnecting, reconnect, clearQueue }`.

```tsx
const { status, attempt, reconnect } = useWebSocketStatus()
```

Backing component: [`WebSocketStatus`](./components.md#websocketstatus).

### `useRateLimitedRequest<TArgs, TResult>(request, options?)`

`src/hooks/useRateLimitedRequest.ts`. Wraps an async function in a token-bucket rate
limiter (default: burst of 10, refilling 1/second — tuned for Horizon/contract calls).
`request` must be referentially stable (wrap it in `useCallback`) or `run`'s identity
changes every render.

Returns `{ run, retryAfterMs }`. Calling `run` past the limit rejects with a
`RateLimitError` and sets `retryAfterMs` for a countdown UI.

```tsx
const fetchBalance = useCallback((id: string) => horizonServer.loadAccount(id), [])
const { run, retryAfterMs } = useRateLimitedRequest(fetchBalance)
```

### `useServiceWorkerUpdate(): void`

`src/hooks/useServiceWorkerUpdate.ts`. Registers the PWA service worker and, when an
update is waiting, shows a persistent toast with a "Refresh" action instead of silently
taking over. Auto-applies the update after 5 minutes of user inactivity so it doesn't
wait forever on an abandoned tab. No params or return value — call once near the app root.

### `useWebVitals(): WebVitalsState` / `initWebVitalsMonitoring(onReport?)`

`src/hooks/useWebVitals.ts`. Observes Core Web Vitals (TTFB, FCP, LCP, CLS, FID) via
`PerformanceObserver` and reports them to monitoring. `initWebVitalsMonitoring` is the
non-hook form (returns a cleanup function) for use outside a component.

```tsx
const vitals = useWebVitals() // { fcp, lcp, cls, fid, ttfb }
```

---

## Persistence & session

### `useLocalStorage<T>(key, initial)`

`src/hooks/useLocalStorage.ts`. Fully documented in
[API_REFERENCE.md § useLocalStorage](../API_REFERENCE.md#uselocalstorage) and in
[`src/hooks/README.md`](../../src/hooks/README.md). `useState`-shaped persistence to
`localStorage`.

### `useDebounce<T>(value, delay?)`

`src/hooks/useDebounce.ts`. Fully documented in
[API_REFERENCE.md § useDebounce](../API_REFERENCE.md#usedebounce). Debounces a value,
only updating after `delay` ms (default 300) of inactivity. Used by
[`ContractEventFeed`](./components.md#contracteventfeed) and
[`TrustlineManager`](./components.md#trustlinemanager) to avoid spamming Horizon on every
keystroke.

### `useSessionTimeout(options: UseSessionTimeoutOptions): UseSessionTimeoutResult`

`src/hooks/useSessionTimeout.ts`. Idle-timeout warning for wallet sessions: tracks
mouse/keyboard/scroll/touch activity, shows a warning with a live countdown before
auto-disconnecting, and resets whenever the user interacts (except while the warning
itself is open, so it doesn't dismiss itself under the user's cursor).

| Option      | Type         | Default                        |
| ----------- | ------------ | ------------------------------ |
| `enabled`   | `boolean`    | —                              |
| `timeoutMs` | `number`     | `900_000` (15 min)             |
| `warningMs` | `number`     | `60_000` (60 s before timeout) |
| `onTimeout` | `() => void` | —                              |

Returns `{ isWarningOpen, remainingWarningSeconds, extendSession, dismissWarning }`.

Backing component: [`SessionTimeoutWarning`](./components.md#sessiontimeoutwarning).

### `useScanCooldown()`

`src/hooks/useScanCooldown.ts`. Thin wrapper over the game store's scan-cooldown slice:
`getRemainingSeconds(pointId)`, `startCooldown(pointId, ms?)`, `canScan(pointId)`, plus
the raw `scanCooldowns` list and `pruneExpiredCooldowns`.

```tsx
const { canScan, startCooldown, getRemainingSeconds } = useScanCooldown()
if (canScan(pointId)) startCooldown(pointId)
```

---

## Component-local hooks

These live beside the one component that uses them rather than in `src/hooks/`, but are
exported and reusable:

- **`useDeviceHints()`** — `src/components/Canvas/useDeviceHints.ts` (also duplicated
  inline in `Effects/BloomEffect.tsx` and `Nebula/ParticleSystem.tsx`). Returns
  `{ isMobile, prefersReducedMotion }` from `matchMedia` checks, memoized once.
- **`useScanPointKeyboardNav(options)`** — `src/components/Canvas/useScanPointKeyboardNav.ts`.
  Returns a keydown handler implementing Tab-style navigation between scan points on the
  nebula canvas (used by [`NebulaCanvas`](./components.md#nebulacanvas)).
- **`useShipUpgradeFlow(ship)`** — `src/components/Dashboard/useShipUpgradeFlow.ts`.
  Orchestrates the optimistic-then-confirmed ship upgrade flow for
  [`ShipDashboard`](./components.md#shipdashboard): local upgrade application, preparing
  a contract-backed upgrade, and confirming/rolling it back.
- **`useAccountBalances(accountId)`** — lives in `src/utils/stellar/balance.ts`, not
  `src/hooks/`, but is a hook (streams live XLM + asset balances for an account). See
  [utils § Stellar balance helpers](./utils.md#balancets). Backing component:
  [`WalletDisplay`](./components.md#walletdisplay).
