# Features

A detailed, code-verified feature list for the Nebula Nomad frontend. Each entry links to the primary implementing files so you can jump straight to the source.

## Wallet & Auth

- **Multi-wallet connect**: Freighter, Albedo, and Ledger hardware wallets, selectable from a single connect modal — `src/components/Wallet/ConnectModal.tsx`, `src/services/wallets/`.
- **Ledger hardware wallet support**: Dedicated connection/signing flow with its own loading/error state — `src/hooks/useLedger.ts`.
- **Session timeout handling**: Warns and disconnects idle sessions — `src/hooks/useSessionTimeout.ts`, `src/components/Wallet/SessionTimeoutWarning.tsx`.
- **Multi-signature transactions**: Build, collect signatures for, and track progress of multisig transactions — `src/hooks/useMultiSig.ts`, `src/utils/multisig-utils.ts`.
- **Transaction signing**: Unified signing hook used across contract calls — `src/hooks/useSignTransaction.ts`.

## Nebula Scanning & Procedural Generation

- **Ledger-seeded procedural nebulae**: Nebula geometry is derived deterministically from a Stellar transaction hash, computed off the main thread in a Web Worker — `src/utils/procedural/nebula.ts`, `src/hooks/useProceduralNebula.ts`, `src/workers/nebula-worker.ts`.
- **Three.js / React Three Fiber canvas**: Particle-based nebula rendering, starfield, camera controls, and interactive scan points — `src/components/Canvas/`, `src/components/Nebula/`.
- **Scan contract integration**: `useNebulaScan` wraps the `scan_nebula` Soroban contract call with loading/error/result state — `src/hooks/contracts/useNebulaScan.ts`.
- **Scan cooldowns**: Rate-limits repeated scans — `src/hooks/useScanCooldown.ts`.
- **Haptic feedback**: Vibration feedback on scan start/success and upgrade actions on supporting devices — `src/utils/haptics.ts`, used from `src/pages/NebulaView.tsx` and `src/components/Ship/UpgradeModal.tsx`.

## Ship & Upgrades

- **Ship dashboard**: Real-time ship stats and resource/NFT asset viewer — `src/components/Dashboard/ShipDashboard.tsx`, `ShipCard.tsx`.
- **Upgrade flow**: Upgrade modal with transaction preview and confirmation — `src/components/Ship/UpgradeModal.tsx`, `src/components/Dashboard/ContractUpgradeConfirmModal.tsx`, `useShipUpgradeFlow.ts`.
- **Upgrade contract integration**: `useShipUpgrade` wraps the `upgrade_ship` contract call — `src/hooks/contracts/useShipUpgrade.ts`.

## Marketplace & Trading

- **On-chain order book DEX**: Trade harvested resources against Stellar's DEX — `src/components/Marketplace/DEXInterface.tsx`, `OrderBook.tsx`, `TradeForm.tsx`, `TradeHistory.tsx`.

## Social & Progression

- **Achievements**: Achievement cards, list view, and toast-style notifications on unlock — `src/components/Achievements/`.
- **Leaderboard**: Player ranking view — `src/components/Leaderboard/Leaderboard.tsx`.
- **Share**: Generate and share a snapshot (achievement, scan, or leaderboard position) via `html2canvas`, with analytics tracking — `src/components/Social/ShareButton.tsx`.
- **Transaction history**: Local history of past on-chain actions — `src/components/History/TransactionHistory.tsx`.

## Transactions & Chain Feedback

- **Transaction lifecycle UI**: Preview, pending, and confirmation modals for every contract call — `src/components/Transaction/`.
- **Live contract event feed**: `src/components/Transaction/ContractEventFeed.tsx`.
- **Gas/fee monitoring**: `src/components/Transaction/GasPriceMonitor.tsx`, `src/hooks/useFeeEstimation.ts`.
- **Retry & recovery**: Automatic retry and recovery flows for failed/stuck transactions — `src/hooks/useTransactionRetry.ts`, `useTransactionRecovery.ts`.

## Real-Time & Offline

- **WebSocket connection status**: `src/hooks/useWebSocketStatus.ts`, `src/components/WebSocket/WebSocketStatus.tsx`.
- **PWA / offline support**: Installable app with an install prompt, offline indicator, and a dedicated cached `/offline` fallback route — `src/components/PWA/`, `public/offline.html`.
- **Service worker update prompts**: `src/hooks/useServiceWorkerUpdate.ts`.

## Onboarding & Help

- **Guided tutorial**: Step-by-step onboarding flow with highlighted UI targets — `src/components/Tutorial/TutorialFlow.tsx`, `OnboardingWelcome.tsx`.
- **Help modal**: In-app reference — `src/components/Help/HelpModal.tsx`.
- **Notifications center**: `src/components/Notifications/NotificationCenter.tsx`.

## Accessibility

- **WAI-ARIA 1.2 combobox**: Custom accessible `Select` component — see [docs/COMPONENTS.md](COMPONENTS.md).
- **Reduced motion support**: Respects `prefers-reduced-motion` and exposes a toggle — `src/hooks/useReducedMotion.ts`.
- **Mobile touch targets**: Button/ButtonGroup sized per WCAG 2.5.5 AAA.
- **Dedicated a11y test suite**: `src/__tests__/a11y/`.

## Internationalization

- **Language hook**: `src/hooks/useLanguage.ts` for locale-aware strings.

## Performance & Monitoring

- **Adaptive performance mode**: Degrades visual fidelity under sustained low FPS — `src/hooks/useAdaptivePerformanceMode.ts`, `useFrameRateMonitor.ts`.
- **Render resource tracking**: Detects Three.js resource leaks — `src/hooks/useRenderResourceTracker.ts`.
- **Web Vitals reporting**: `src/hooks/useWebVitals.ts`.
- **Debug overlay**: In-app performance monitor — `src/components/Debug/PerformanceMonitor.tsx`.
- **Analytics**: Lightweight event tracking — `src/services/analytics.ts`.

## Responsive Design

- **Mobile-first layout**: Tailwind CSS, dark mode, touch gesture support — `src/hooks/useTouchGestures.ts`, `src/layouts/AppLayout.tsx`.

## Testing

- **Unit/component**: Vitest + React Testing Library (`npm test`).
- **Accessibility**: Dedicated a11y project (`npm run test:a11y`).
- **Performance**: FPS/memory/render budget suites (`npm run performance:test`).
- **End-to-end**: Playwright specs covering navigation, nebula scanning, ship upgrades, marketplace, and accessibility — `e2e/`.
- **Storybook**: Component stories for isolated UI development (`npm run storybook`).

---

For architecture and data-flow details, see [docs/ARCHITECTURE.md](ARCHITECTURE.md), [docs/STATE_MANAGEMENT.md](STATE_MANAGEMENT.md), and [docs/DATA_FLOW.md](DATA_FLOW.md). For the API surface, see [docs/API/](API/).
