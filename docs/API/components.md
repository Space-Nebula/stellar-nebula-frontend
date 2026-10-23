# Components API

Every component folder in `src/components/*`, plus the handful of components that live
directly in `src/components/` (not inside a folder). Props are listed as a table where a
component takes more than one or two; a one-line description otherwise. Components whose
accessibility behavior already has a deep write-up in
[`docs/COMPONENTS.md`](../COMPONENTS.md) link there instead of repeating it.

## Table of contents

- [Design system / UI primitives](#design-system--ui-primitives)
- [Layout & navigation](#layout--navigation)
- [Wallet](#wallet)
- [Canvas & 3D (Nebula view)](#canvas--3d-nebula-view)
- [Dashboard & ship](#dashboard--ship)
- [Resources & marketplace](#resources--marketplace)
- [Transactions](#transactions)
- [Achievements, leaderboard & social](#achievements-leaderboard--social)
- [Notifications, PWA & WebSocket](#notifications-pwa--websocket)
- [Tutorial & help](#tutorial--help)
- [Loading, error boundaries & debug](#loading-error-boundaries--debug)
- [Settings](#settings)

---

## Design system / UI primitives

### `Button` / `ButtonGroup`

`src/components/Button.tsx`. Accessible button enforcing a 44×44px minimum touch target
(WCAG 2.1 SC 2.5.5 AAA) across every size/variant, using the React 19 ref-as-prop pattern.

| Prop                     | Type                                              | Default     | Purpose                                          |
| ------------------------ | ------------------------------------------------- | ----------- | ------------------------------------------------ |
| `variant`                | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Visual style.                                    |
| `size`                   | `'sm' \| 'md' \| 'lg' \| 'icon'`                  | `'md'`      | Size preset (all meet the touch-target minimum). |
| `isLoading`              | `boolean`                                         | `false`     | Shows a spinner and swaps in `loadingText`.      |
| `loadingText`            | `string`                                          | —           | Label shown/announced while loading.             |
| `leftIcon` / `rightIcon` | `ReactNode`                                       | —           | Decorative icons (auto `aria-hidden`).           |
| `fullWidth`              | `boolean`                                         | `false`     | Stretches to the container width.                |
| ...rest                  | `ButtonHTMLAttributes`                            | —           | Forwarded to the `<button>`.                     |

`ButtonGroup` wraps a set of buttons with a guaranteed ≥8px gap (`direction?: 'row' | 'column'`)
to prevent accidental adjacent taps on mobile.

```tsx
<Button variant="danger" isLoading={isSubmitting} loadingText="Signing…">
  Sign transaction
</Button>
```

### `IconButton`

`src/components/IconButton.tsx`. Icon-only button that requires an `aria-label` (WCAG
2.1 SC 4.1.2) and hides its icon children from assistive tech automatically.

| Prop         | Type                                            | Default     |
| ------------ | ----------------------------------------------- | ----------- |
| `aria-label` | `string` (required)                             | —           |
| `variant`    | `'default' \| 'ghost' \| 'outline' \| 'subtle'` | `'default'` |
| `size`       | `'sm' \| 'md' \| 'lg'`                          | `'md'`      |

### `Image` / `OptimizedImage`

`src/components/Image.tsx` enforces the WCAG 1.1.1 alt-text contract at the type level: a
discriminated union on `variant`. `variant="informative"` requires a non-empty `alt`;
`variant="decorative"` forbids `alt` and sets `alt="" aria-hidden="true"` automatically.

```tsx
<Image variant="informative" src="/ship.png" alt="Upgraded scout ship" />
<Image variant="decorative" src="/nebula-bg.png" />
```

`src/components/OptimizedImage.tsx` extends that idea with lazy loading, a blur
placeholder, responsive `srcSet`/`sizes`, and an optional WebP `<picture>` fallback.

| Prop               | Type                | Default      |
| ------------------ | ------------------- | ------------ |
| `src`, `alt`       | `string`            | — (required) |
| `width` / `height` | `number`            | —            |
| `sizes` / `srcSet` | `string`            | —            |
| `loading`          | `'lazy' \| 'eager'` | `'lazy'`     |
| `webpSrc`          | `string`            | —            | WebP variant; `src` stays the fallback. |

### `MotionToggle`

`src/components/MotionToggle.tsx`. User control for pausing/resuming nebula animations
or toggling reduced-motion mode (WCAG 2.1 SC 2.2.2), backed by
[`useReducedMotion`](./hooks.md#usereducedmotion-usereducedmotionreturn).

| Prop             | Type                                       | Default                                                          |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `variant`        | `'compact' \| 'full'`                      | `'compact'` — `'full'` adds a "reset to system default" control. |
| `onMotionChange` | `(isPaused, prefersReducedMotion) => void` | —                                                                |
| `label`          | `string`                                   | derived from state                                               |

### `ThemeToggle`

`src/components/ThemeToggle.tsx`. No props — reads/toggles `ThemeContext`. Renders a
sun/moon icon button with `aria-pressed` reflecting the current theme.

### `ErrorDisplay`

`src/components/ErrorDisplay.tsx`. Shows a friendly, actionable error (via
`toFriendlyError`, see [utils § error-messages.ts](./utils.md#error-messagests)); logs the
raw error to error tracking and only reveals technical details in development builds.

| Prop      | Type                 | Purpose                                   |
| --------- | -------------------- | ----------------------------------------- |
| `error`   | `unknown` (required) | The raw error — never rendered as-is.     |
| `onRetry` | `() => void`         | Shows a "Try again" button when provided. |

### `SkipLink` / `SkipLinks`

`src/components/SkipLink.tsx`. Standard "skip to main content" pattern: focuses and
scrolls to the target element on click/activation instead of relying on default anchor
behavior (`targetId: string`, `children: ReactNode`). `SkipLinks` renders the pair used
app-wide (`mainId`/`navId`, defaulting to `'main-content'`/`'navigation'`).

### `RouteLoader`

`src/components/RouteLoader.tsx`. Top-level `<Suspense>` boundary for lazy-loaded routes;
shows [`LoadingScreen`](#loadingscreen) instead of a blank page while a route chunk
downloads. `{ children: ReactNode }`.

### `NetworkSelector`

`src/components/NetworkSelector.tsx`. Dropdown for switching the active Stellar network.

| Prop                     | Type                                           | Default |
| ------------------------ | ---------------------------------------------- | ------- |
| `currentNetwork`         | `StellarNetwork` (required)                    | —       |
| `onNetworkChange`        | `(network: StellarNetwork) => void` (required) | —       |
| `isLoading` / `disabled` | `boolean`                                      | `false` |

### `LedgerConnect`

`src/components/LedgerConnect.tsx`. Step-by-step Ledger hardware wallet connection flow
(checking support → requesting → connected/error), built on
[`useLedger`](./hooks.md#useledgeroptions-uselegeroptions-ledgerconnectionstate--connect-disconnect-signtransaction-clearerror-checkavailability).

| Prop        | Type                          | Default     |
| ----------- | ----------------------------- | ----------- |
| `network`   | `StellarNetwork`              | `'testnet'` |
| `onConnect` | `(publicKey: string) => void` | —           |
| `onError`   | `(error: string) => void`     | —           |
| `isLoading` | `boolean`                     | `false`     |

### `MultiSigBuilder`

`src/components/MultiSigBuilder.tsx`. No props — self-contained multi-signature
transaction builder UI on top of [`useMultiSig`](./hooks.md#usemultisig-multisigstate):
paste an XDR + threshold + signer list, collect signatures, export the bundle as JSON.

### UI design-system components (`src/components/UI/`)

- **`Modal`** — centralized accessible dialog primitive: focus trap (via
  [`useFocusTrap`](./hooks.md#usefocustraptoptions-focustrapoptions-reactrefobjectt--null)),
  scroll lock, ESC/backdrop dismissal, consistent enter animation. Props: `isOpen`,
  `onClose`, `title?`, `ariaLabel?`, `footer?`, `size?: 'sm'|'md'|'lg'|'xl'` (default
  `'md'`), `closeOnBackdrop?`/`closeOnEsc?` (default `true`), `hideHeader?`/`hideCloseButton?`.
  Prefer opening modals through a `useModal()` state hook where one exists; use this
  directly only when local `isOpen` state is genuinely simpler.
  ```tsx
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Confirm"
    footer={<Button onClick={onConfirm}>OK</Button>}
  >
    <p>Are you sure?</p>
  </Modal>
  ```
- **`Spinner`** — inline loading indicator. `{ size?: 'sm'|'md'|'lg' (default 'md'), text?: string }`.
  Use [`Loading`](#loading) for the smaller inline variant and
  [`LoadingScreen`](#loadingscreen) for full-page loads.
- **`AppToaster`** — no props; mounts the app-wide `react-hot-toast` host once, capping
  simultaneously visible toasts (`TOAST_STACK_LIMIT`) and applying per-type durations
  from [utils § toast](../API_REFERENCE.md#toast-utilities).
- **`EmptyState`** and its presets `EmptyInventory`, `EmptyTransactions`,
  `EmptyAchievements`, `EmptyMarketplace` (`src/components/UI/EmptyStates.tsx`) — shared
  "nothing here yet" panel. Preset props: `{ action?: EmptyStateAction, secondaryAction?: EmptyStateAction, compact?: boolean, className?: string }`,
  each with its own icon/title/description baked in.

Also see [COMPONENTS.md § Custom Select Component](../COMPONENTS.md#1-custom-select-component-wai-aria-12-combobox)
for `Select` (built on [`useCombobox`](./hooks.md#usecomboboxtoptions-usecomboboxoptionst-usecomboboxreturnt))
and [COMPONENTS.md § Mobile Touch Targets](../COMPONENTS.md#3-mobile-touch-targets-button--buttongroup--wcag-21-sc-255-aaa)
for the `Button`/`ButtonGroup` touch-target rationale.

---

## Layout & navigation

### `Header` / `Footer` / `MobileMenu` (`src/components/Layout/`)

- **`Header`** — desktop nav + wallet button + mobile hamburger trigger.
  `{ onOpenConnectModal?: () => void }`. Renders its own inline mobile menu (separate
  from `MobileMenu` below) when the hamburger is toggled.
- **`Footer`** — doc/GitHub/Discord links, live network indicator. No props.
- **`MobileMenu`** — slide-in nav panel used by [`Navigation`](#navigation-root-level).
  `{ isOpen, items: { label, to }[], onClose }`. Locks body scroll and closes on Escape
  while open.

### `Navigation` (root level)

`src/components/Navigation.tsx`. No props. Alternate top-level nav shell (used instead
of `Layout/Header` + `Layout/Footer` in some route trees): renders the help modal,
`ThemeToggle`, compact `WebSocketStatus`, `NotificationCenter`, and the `Layout/MobileMenu`.

---

## Wallet

### `ConnectModal`

`src/components/Wallet/ConnectModal.tsx`. Wallet-selection dialog (Freighter, xBull,
Ledger, Albedo, WalletConnect), showing install/availability state per option and a
loading overlay while connecting. `{ isOpen: boolean, onClose: () => void }`. Built on
the native `<dialog>` element.

### `StatusIndicator`

`src/components/Wallet/StatusIndicator.tsx`. Compact connected/connecting/disconnected
pill with a hover/focus tooltip showing address, wallet type, and network.
`{ onOpenConnectModal?: () => void }`.

### `WalletDisplay`

`src/components/Wallet/WalletDisplay.tsx`. Fuller wallet chip: live XLM balance (via
[`useAccountBalances`](./utils.md#balancets), with a streaming indicator and a brief
glow animation on balance change), a dropdown of other asset holdings, copy-to-clipboard
address, and disconnect. `{ onOpenConnectModal?: () => void }`.

### `SessionTimeoutWarning`

`src/components/Wallet/SessionTimeoutWarning.tsx`. Modal dialog shown by
[`useSessionTimeout`](./hooks.md#usesessiontimeoutoptions-usesessiontimeoutoptions-usesessiontimeoutresult)
with a live countdown and "Stay connected" / "Disconnect now" actions.

| Prop               | Type         |
| ------------------ | ------------ |
| `isOpen`           | `boolean`    |
| `remainingSeconds` | `number`     |
| `onExtend`         | `() => void` |
| `onDisconnect`     | `() => void` |

---

## Canvas & 3D (Nebula view)

### `NebulaCanvas`

`src/components/Canvas/NebulaCanvas.tsx` (re-exported from `src/components/NebulaCanvas.tsx`
and `src/components/Nebula`). The main interactive 3D scene: starfield + procedural
nebula particles + four scannable anomaly points, full keyboard support (Tab between
points, Enter/Space to scan, WASD/arrows + Q/E to orbit/zoom, R to reset, P/Space to
pause), and a live region for screen-reader scan announcements. Wrapped in `React.memo`.

| Prop                 | Type                                      | Default                                 |
| -------------------- | ----------------------------------------- | --------------------------------------- |
| `showFps`            | `boolean`                                 | `false`                                 |
| `showMotionControls` | `boolean`                                 | `true`                                  |
| `reducedMotion`      | `boolean`                                 | follows `useReducedMotion()` if omitted |
| `onScanComplete`     | `(resourceType, amount, pointId) => void` | —                                       |

### `CameraControls`

`src/components/Canvas/CameraControls.tsx`. `OrbitControls` wrapper adding keyboard
orbit/zoom (WASD/arrows, Q/E, Shift for precision, R to reset) and touch gestures (via
[`useTouchGestures`](./hooks.md#usetouchgesturestargetref-callbacks-touchgesturecallbacks-void))
on top of mouse drag.

| Prop                                             | Type             | Default |
| ------------------------------------------------ | ---------------- | ------- |
| `isMobile` / `performanceMode` / `reducedMotion` | `boolean`        | `false` |
| `onTapToScan`                                    | `(x, y) => void` | —       |

### `ScanPointControls`

`src/components/Canvas/ScanPointControls.tsx`. The keyboard-accessible overlay button
row for each scan point (the 3D `InteractiveScanPoint` meshes are not independently
focusable, so this is the actual Tab target). Props mirror the per-point state:
`points`, `remainingSecondsMap`, `scanningPoints`, `focusedPointId`, `isMotionReduced`,
`onFocusPoint`, `onClearFocus`, `onScan`.

### `InteractiveScanPoint` / `InteractiveScanPoints`

`src/components/Nebula/InteractiveScanPoint.tsx`. The 3D anomaly mesh: pulses, shows a
cooldown ring + countdown, a keyboard-focus ring, a scanning indicator, and a rarity
badge. `InteractiveScanPoints` renders the fixed set of four. Props on the singular
component: `data: ScanPointData`, `onScan?`, `cooldown?`, `remainingSeconds?`,
`isScanning?`, `isFocused?`.

### `ParticleSystem` / `Starfield` / `ProceduralNebulaField`

`src/components/Nebula/`. Three.js `<points>` layers rendered inside the canvas:

- **`ParticleSystem`** — shader-based nebula cloud with device-adaptive particle count
  (via `useThreeJsLod`, see [utils § threejs/lod.ts](./utils.md#threejslodts)).
  `{ density?: number (default 0.8), performanceMode?: boolean }`.
- **`Starfield`** — background starfield with per-star twinkle and camera parallax.
  `{ density: number (required), performanceMode?: boolean }`.
- **`ProceduralNebulaField`** — renders geometry produced by
  [`useProceduralNebula`](./hooks.md#useproceduralnebulaconfig-nebulaconfig--null--geometry-isloading)
  / [`generateNebulaGeometry`](./utils.md#proceduralnebulats).
  `{ geometry: NebulaGeometry (required), performanceMode?: boolean }`.

### `BloomEffect` / `DepthOfFieldEffect`

`src/components/Effects/`. `@react-three/postprocessing` wrappers, both device-adaptive
(reduce quality on mobile / `prefers-reduced-motion` / explicit `performanceMode`).
`BloomEffect`: `{ enabled: boolean (required), intensity: number (required), performanceMode?: boolean }`.
`DepthOfFieldEffect`: `{ enabled?: boolean (default true), performanceMode?: boolean }`.

### `ShipPreview`

`src/components/Ship/ShipPreview.tsx`. Standalone 3D ship viewer (placeholder box-mesh
model, pending real GLTF assets) with orbit controls and an optional before/after
upgrade comparison toggle.

| Prop             | Type         | Default                |
| ---------------- | ------------ | ---------------------- |
| `shipModel`      | `string`     | — (unused placeholder) |
| `upgradeLevel`   | `number`     | `1`                    |
| `showComparison` | `boolean`    | `false`                |
| `onClose`        | `() => void` | —                      |

---

## Dashboard & ship

### `ShipDashboard`

`src/components/Dashboard/ShipDashboard.tsx`. No props — the `/dashboard` page body.
Seeds demo ships/inventory into the store on first mount if empty, then composes
[`ShipCard`](#shipcard) per ship, [`Inventory`](#inventory), the upgrade queue,
[`AchievementList`](#achievementlist), [`UpgradeModal`](#upgrademodal),
[`ContractUpgradeConfirmModal`](#contractupgradeconfirmmodal), and
[`TransactionHistory`](#transactionhistory-component). Orchestrated by the
[`useShipUpgradeFlow`](./hooks.md#component-local-hooks) local hook.

### `ShipCard`

`src/components/Dashboard/ShipCard.tsx`. Selectable fleet-list entry.
`{ ship: Ship, active: boolean, onSelect: (shipId: string) => void }`.

### `ContractUpgradeConfirmModal`

`src/components/Dashboard/ContractUpgradeConfirmModal.tsx`. Pre-sign review for an
on-chain ship upgrade: wraps [`ConfirmModal`](#confirmmodal) with a
[`TransactionPreview`](#transactionpreview-transaction-folder) showing the simulated fee,
resource costs, and expected outcome.

| Prop                     | Type                             |
| ------------------------ | -------------------------------- |
| `upgrade`                | `ShipUpgradeOption \| null`      |
| `upgradeContract`        | return value of `useShipUpgrade` |
| `walletPublicKey`        | `string \| null`                 |
| `isPreparing`            | `boolean`                        |
| `onConfirm` / `onCancel` | `() => void`                     |

### `UpgradeModal`

`src/components/Ship/UpgradeModal.tsx`. Also exports `SHIP_UPGRADES: ShipUpgradeOption[]`
(the three available upgrades) and the batch-operation builder used to preview them.
Lets the player pick an upgrade, shows its resource cost and before/after stats, and
previews the ordered batch of on-chain operations
([`buildBatchTransaction`](./utils.md#batchtransactionts)) it will submit.

| Prop        | Type                                                    |
| ----------- | ------------------------------------------------------- |
| `isOpen`    | `boolean`                                               |
| `ship`      | `Ship \| null`                                          |
| `inventory` | `ResourceInventory`                                     |
| `isPending` | `boolean` (default `false`)                             |
| `onClose`   | `() => void`                                            |
| `onConfirm` | `(upgrade: ShipUpgradeOption) => void \| Promise<void>` |

---

## Resources & marketplace

### `Inventory`

`src/components/Resources/Inventory.tsx`. Resource grid with filter
(all/stocked/low/empty) and sort (amount ↑/↓/name) controls, a "latest harvest" banner,
and per-resource pending-delta indicators from in-flight optimistic transactions.

| Prop        | Type                | Default                          |
| ----------- | ------------------- | -------------------------------- |
| `inventory` | `ResourceInventory` | falls back to the resource store |
| `compact`   | `boolean`           | `false`                          |
| `title`     | `string`            | `'Resource Inventory'`           |

### `DEXInterface` / `OrderBook` / `TradeForm` / `TradeHistory` (`src/components/Marketplace/`)

- **`DEXInterface`** — no props; composes the other three plus an asset picker and a
  placeholder price chart. Currently backed by mock/simulated market data.
- **`OrderBook`** — `{ bids: Order[], asks: Order[] }`; renders top-10 bids/asks each
  with a depth-visualization bar and the current spread.
- **`TradeForm`** — validated buy/sell form (via
  [`useFormValidation`](./hooks.md#useformvalidationvalues-initialvalues-schema-options-useformvalidationreturnvalues)).
  `{ baseAsset, quoteAsset, currentPrice, maxAmount? (default 100), onSubmit: (type, price, amount) => void }`.
- **`TradeHistory`** — `{ trades: Trade[] }`; recent trades list, shows
  [`EmptyMarketplace`](#ui-design-system-components-srccomponentsui) when empty.

---

## Transactions

All in `src/components/Transaction/` unless noted; re-exported from
`src/components/Transaction/index.ts`.

### `ConfirmModal`

Generic pre-sign confirmation dialog (native `<dialog>`): title, operation type badge,
estimated fee, an arbitrary detail list, optional `children` (e.g. a
`TransactionPreview`), and a submitting/error state.

| Prop                                                                                | Type             | Default                  |
| ----------------------------------------------------------------------------------- | ---------------- | ------------------------ |
| `isOpen`, `title`, `operationType`, `estimatedFee`, `details: ConfirmationDetail[]` | —                | required                 |
| `isSubmitting`                                                                      | `boolean`        | `false`                  |
| `error`                                                                             | `string \| null` | `null`                   |
| `confirmLabel` / `cancelLabel`                                                      | `string`         | `'Confirm'` / `'Cancel'` |
| `onConfirm` / `onCancel`                                                            | `() => void`     | required                 |
| `children`                                                                          | `ReactNode`      | —                        |

### `TransactionPending`

Shown inside `ConfirmModal` while waiting on the wallet to sign.
`{ message?: string }` (default: "Waiting for your wallet signature…"); notes the 60s
signing timeout in its copy.

### `TransactionPreview` (`Transaction` folder)

Not the same component as the root-level [`TransactionPreview`](#transactionpreview-root) —
this one renders an already-computed simulation/cost breakdown rather than estimating one
itself.

| Prop              | Type                                    |
| ----------------- | --------------------------------------- |
| `operationName`   | `string`                                |
| `feeStroops`      | `string \| number \| null \| undefined` |
| `costs`           | `{ label: string, amount: string }[]`   |
| `outcomes`        | `{ label: string, value: string }[]`    |
| `simulation`      | `ParsedSimulationResult \| null`        |
| `simulationError` | `string \| null`                        |

### `TransactionRetryButton` / `TransactionRecoveryPanel`

`TransactionRetryButton<TPayload>` — shows the preserved failed transaction, current
attempt count, and a Retry button. `{ failure: TransactionRetryFrame<TPayload>, isRetrying, attempt, maxAttempts, onRetry, onCancel?, retryLabel? }`.

`TransactionRecoveryPanel<TPayload>` — the full recovery surface (retry / dismiss /
roll back) for a [`useTransactionRecovery`](./hooks.md#usetransactionrecoverytpayloadoptions-usetransactionrecoveryoptions-transactionrecovery)
result; renders `TransactionRetryButton` internally when a retryable failure exists.
`{ recovery: TransactionRecovery, failure?: TransactionRetryFrame<TPayload> | null, maxAttempts? (default 3), canRollback? (default true) }`.

### `TrustlineManager`

Self-contained trustline (changeTrust) workflow: inspect current trustline status for an
asset, estimate the reserve impact, prepare + confirm + submit the transaction. No
props — reads the active wallet/network itself.

### `ContractEventFeed`

Live Soroban contract event stream for a given contract id (debounced input validated
against the `C...` strkey pattern before streaming starts).
`{ defaultContractId?: string }`.

### `GasPriceMonitor`

Polls Soroban fee stats every 30s and surfaces a calm/watch/high alert level with the
current base fee, P95 fee, and trend. `{ config?: StellarNetworkConfig }`.

### `TransactionPreview` (root)

`src/components/TransactionPreview.tsx`. Distinct from the `Transaction`-folder
component above — this one estimates the fee itself via
[`useFeeEstimation`](./hooks.md#usefeeestimationtransaction-transaction--null-options-usefeeestimationoptions-feeestimationstate--estimatefee-clearerror)
rather than taking a precomputed breakdown, and flags "high fee" transactions via
[`isPricyTransaction`](./utils.md#fee-calculatorts).

| Prop                     | Type                             | Default    |
| ------------------------ | -------------------------------- | ---------- |
| `transaction`            | `Transaction \| null` (required) | —          |
| `onConfirm` / `onCancel` | `() => void`                     | —          |
| `isSubmitting`           | `boolean`                        | `false`    |
| `networkRate`            | `number`                         | `BASE_FEE` |

---

## Achievements, leaderboard & social

### `AchievementCard` / `AchievementList`

`src/components/Achievements/`. `AchievementCard`: `{ achievement: Achievement, footer?: ReactNode }` —
a single achievement's progress bar, rarity styling, and unlock date. `AchievementList`:
no props; filter (all/unlocked/locked) + sort (progress/rarity) grid of every
achievement, built from `buildAchievements(stats, unlockedAtById)`.

### `AchievementNotification` / `AchievementNotifier`

`AchievementNotification` — toast stack for newly unlocked achievements, each
auto-dismissing after 5s. `{ notifications: Achievement[], onDismiss?: (id) => void }`.
`AchievementNotifier` — no props; bridges the achievement store's `pendingNotifications`
to both the global notification center and `AchievementNotification`.

### `Leaderboard`

`src/components/Leaderboard/Leaderboard.tsx`. No props — fetches a paginated leaderboard
(`fetchLeaderboardPage`) every 30s, highlights the current wallet's row, and offers a
[`ShareButton`](#sharebutton) for the player's own rank.

### `ShareButton`

`src/components/Social/ShareButton.tsx`. Generates a branded share-card image via
`html2canvas` and offers it through X (Twitter) intent, Discord, clipboard image copy,
or PNG download.

| Prop                    | Type                                               | Default                                                                      |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `title` / `description` | `string`                                           | falls back to `achievementTitle`/`achievementDescription`, then generic copy |
| `subject`               | `'achievement' \| 'scan' \| 'leaderboard'`         | `'achievement'`                                                              |
| `playerStats`           | `{ scans?, upgrades?, resources?, rank?, score? }` | —                                                                            |
| `variant`               | `'icon' \| 'full'`                                 | `'full'`                                                                     |

---

## Notifications, PWA & WebSocket

### `NotificationCenter` / `NotificationBootstrap`

`src/components/Notifications/`. `NotificationCenter` — no props; bell-icon dropdown
over the shared notification context (mark read/all-read/clear, relative timestamps,
outside-click + Escape to close). `NotificationBootstrap` — no props; seeds the
notification feed with an initial message plus route-change and wallet-connect events.

### `InstallPrompt` / `OfflineIndicator`

`src/components/PWA/`. `InstallPrompt` — no props; listens for `beforeinstallprompt`,
shows a custom install card after 30s (unless previously dismissed), tracks
accept/dismiss analytics. `OfflineIndicator` — no props; floating pill reporting
online/offline/slow-connection state (via `navigator.onLine` + the Network Information
API where available), with a manual retry that probes Horizon.

### `WebSocketStatus`

`src/components/WebSocket/WebSocketStatus.tsx`. Connection-state indicator for the app's
WebSocket manager, backed by
[`useWebSocketStatus`](./hooks.md#usewebsocketstatusmanager-websocketmanager-usewebsocketstatusreturn).

| Prop                | Type                              | Default               |
| ------------------- | --------------------------------- | --------------------- |
| `manager`           | `WebSocketManager`                | the default singleton |
| `variant`           | `'pill' \| 'banner' \| 'compact'` | `'pill'`              |
| `showWhenConnected` | `boolean`                         | `true`                |

---

## Tutorial & help

### `OnboardingWelcome`

`src/components/Tutorial/OnboardingWelcome.tsx`. No props. Full-screen welcome modal
shown once, only on a brand-new visitor's very first load (never dismissed, never
completed, never started); offers "Start guided tour" or "Skip".

### `TutorialFlow` / `TutorialHighlight`

`TutorialFlow` — no props besides `{ onClose?: () => void }`; step-by-step guided tour
with per-step objectives (e.g. "connect wallet" gates advancing past that step) and a
"Replay tutorial" state once completed. `TutorialHighlight` — spotlight overlay for the
step's target element. `{ selector: string | null, visible: boolean }`.

### `HelpModal`

`src/components/Help/HelpModal.tsx`. Searchable FAQ (Game Mechanics / Wallet /
Troubleshooting categories) plus static wallet-help and external-docs sections.
`{ isOpen: boolean, onClose: () => void }`. Uses
[`useFocusTrap`](./hooks.md#usefocustraptoptions-focustrapoptions-reactrefobjectt--null)
directly since it isn't built on the shared `Modal` primitive.

---

## Loading, error boundaries & debug

### `Loading` / `LoadingSkeleton` / `LoadingScreen`

`src/components/Loading/`. `Loading` — small inline spinner for actions/short waits:
`{ label? (default 'Loading'), size?: 'sm'|'md'|'lg' (default 'md') }`. `LoadingSkeleton` —
placeholder content shape for lists/cards: `{ lines? (default 3), label? (default 'Loading content') }`.
`LoadingScreen` — full-page loading screen with rotating flavor messages and a progress
bar: `{ message?, stageLabel? (default 'Initializing systems'), progress?: number }`.
There are also skeleton variants per feature
(`SkeletonDashboard`/`SkeletonLeaderboard`/`SkeletonMarketplace`/`SkeletonNebulaView`)
that compose `LoadingSkeleton` into feature-shaped placeholders.

### `ErrorBoundary` / `FeatureErrorBoundary`

`src/components/ErrorBoundary/`. Class components (error boundaries must be classes).
`ErrorBoundary` — app-root boundary: full-page fallback, auto-retries transient
(network/fetch/timeout) errors up to twice with increasing delay, logs to error tracking
and analytics. `{ children, fallback?, onError?: (error, errorInfo) => void }`.
`FeatureErrorBoundary` — the same contract scoped to one feature section (Canvas,
Marketplace, Dashboard panel, etc.) so one broken component doesn't take down the whole
page; auto-retries once. `{ feature: string, children, fallback?, onError? }`.

### `PerformanceMonitor`

`src/components/Debug/PerformanceMonitor.tsx`. No props. Fixed-position FPS/particle-
count/JS-heap overlay, toggled with Ctrl+Shift+P; reports FPS samples to analytics.

---

## Settings

### `SettingsPanel`

`src/components/Settings/SettingsPanel.tsx`. `{ onClose?: () => void }`. Graphics
quality/bloom/performance-mode/auto-rotate toggles, sound, notifications, privacy
(analytics opt-out), network selection, and save-data import/export/reset — composing
small local `Toggle`/`Select` helpers over `useSettingsStore` and `useGraphicsStore`.
