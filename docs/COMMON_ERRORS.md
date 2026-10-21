# Common Errors and Solutions

A quick-reference guide diagnosing common error messages, root causes, and verified solutions.

---

## 1. Wallet & Authentication Errors

### Error: `Freighter extension not found or locked`

- **Cause:** The Freighter browser extension is disabled, locked, or not installed.
- **Solution:** Install the Freighter extension from the Chrome Web Store or Firefox Add-ons. Unlock your wallet and grant the site permission to view your public key.

### Error: `Invalid network passphrase`

- **Cause:** The network passphrase in `VITE_STELLAR_PASSPHRASE` does not match the network your wallet signed against.
- **Solution:** Align your `.env.local` settings with the target network:
  - Testnet: `Test SDF Network ; September 2015`
  - Futurenet: `Test SDF Future Network ; October 2022`
  - Mainnet: `Public Global Stellar Network ; September 2015`

### Error: `Ledger WebUSB device not found`

- **Cause:** The Ledger device is disconnected, screen-locked, or the Stellar app is not opened.
- **Solution:** Connect your Ledger via USB, unlock with your PIN, open the Stellar app on the device, and grant WebUSB permission when prompted by Chrome/Brave.

---

## 2. Soroban Smart Contract & RPC Errors

### Error: `HostError: Error(Contract, #1)`

- **Cause:** Contract execution aborted due to custom contract logic error (e.g. insufficient authorization or invalid state transition).
- **Solution:** Inspect the contract ID in `VITE_NEBULA_CONTRACT_ID`. Check contract method arguments and ensure required auth entries have valid signatures.

### Error: `tx_bad_seq`

- **Cause:** Account sequence number mismatch caused by concurrent transactions submitted from the same account.
- **Solution:** Reload the account sequence from Horizon using `server.loadAccount(pubkey)` immediately before building each transaction.

### Error: `tx_insufficient_fee`

- **Cause:** Base fee offered is below the current network surge fee minimum.
- **Solution:** Query `server.fetchBaseFee()` and dynamically apply a fee multiplier during network surge pricing.

---

## 3. Build & Runtime Errors

### Error: `Uncaught ReferenceError: Buffer is not defined`

- **Cause:** Node.js `Buffer` global missing in browser environment during cryptographic operations.
- **Solution:** Ensure `import { Buffer } from 'buffer'` polyfill is loaded before Stellar SDK operations (handled in `src/main.tsx`).

### Error: `WebGL context was lost`

- **Cause:** GPU out of memory or driver reset triggered by background GPU load.
- **Solution:** Reload the window. The application includes a `WebGLContextHandler` that automatically re-initializes Three.js scenes upon context restoration.
