Closes #544, Closes #545, Closes #546, Closes #552

### Summary of Changes

- **#544 (Three.js Memory Leak Disposal)**:
  - Added comprehensive `useEffect` cleanup in `NebulaView` and `NebulaParticles` disposing geometries, materials, and textures.
  - Implemented `useNebulaScene` hook for scene lifecycle management and disposable tracking across sector changes.
  - Added cloned model cleanup and preload method in `ShipModel.tsx`.
  - Added controls disposal on unmount in `CameraControls.tsx`.
  - Added performance regression test `test/performance/memory-leak.test.ts` verifying stable memory usage across 10+ scene changes under the 150MB threshold.

- **#545 (Wallet Transaction Race Condition Prevention)**:
  - Implemented `TransactionQueue` with sequence verification and locking in `src/services/stellar/transaction.ts`.
  - Added `isTransactionPending` state and lock enforcement to `WalletContext` and `useWalletConnect`.
  - Created `ScanButton` with 500ms debounce and disabled state during pending operations.
  - Created `ShipUpgrade` component with loading indicator and transaction gating.
  - Added error toast notifications when actions are attempted during pending transactions.
  - Added E2E regression test in `e2e/rapid-clicks.spec.ts`.

- **#546 (Freighter Firefox Timing & Retry)**:
  - Implemented `detectFreighterWithRetry` with exponential backoff (waiting up to 3 seconds) and `FreighterLoaded` / `freighter:ready` event listeners in `src/services/wallets/freighter.ts`.
  - Created `useWalletDetection` hook managing detection retries and loading states.
  - Created `WalletConnect` component displaying "Detecting wallet..." and manual "Retry Detection" button.
  - Documented Firefox asynchronous extension injection behavior in `docs/TROUBLESHOOTING.md`.
  - Added Firefox wallet timing E2E test in `e2e/wallet-detection-firefox.spec.ts`.

- **#552 (DEX Trade Form Validation)**:
  - Added amount normalization for scientific notation (e.g. `1e-5`) and strict validation utilities in `src/utils/validation.ts`.
  - Enforced positive numeric amounts, maximum 7 decimal places (Stellar stroops limit), and minimum trade amount (0.0000001).
  - Added real-time balance display and validation against available balance.
  - Implemented submit button disabling when form validation fails.
  - Created `useTradeValidation` hook and `fetchAccountBalances` / `fetchUserAssetBalance` service in `src/services/stellar/asset-balance.ts`.
  - Created comprehensive validation tests in `src/__tests__/components/TradeForm.test.tsx` and updated `src/components/Marketplace/__tests__/TradeForm.test.tsx`.
