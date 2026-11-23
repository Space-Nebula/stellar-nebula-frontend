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

- **Friendly Message:** "Account sequence out of sync"
- **Cause:** Account sequence number mismatch caused by concurrent transactions submitted from the same account.
- **Recovery Action:** Reload the account sequence from Horizon using `server.loadAccount(pubkey)` immediately before building each transaction.
- **Solution:** Re-sync wallet sequence by calling `server.loadAccount` or reconnecting wallet.

### Error: `op_underfunded`

- **Friendly Message:** "Insufficient XLM balance for transaction fee"
- **Cause:** Wallet does not hold enough XLM to pay for transaction operations, fees, and the Stellar base reserve (0.5 XLM per subentry + 1 XLM minimum account reserve).
- **Recovery Action:** Add funds to your wallet to cover the transaction and reserve balance.
- **Solution:** Fund account with additional XLM from testnet friendbot or exchange.

### Error: `tx_insufficient_fee`

- **Friendly Message:** "Insufficient transaction fee"
- **Cause:** Base fee offered is below the current network surge fee minimum.
- **Recovery Action:** Enable dynamic fee estimation or retry the transaction with a higher fee limit.
- **Solution:** Query `server.fetchBaseFee()` and dynamically apply a fee multiplier during network surge pricing.

### Error: `tx_too_late`

- **Friendly Message:** "Transaction timed out"
- **Cause:** Transaction time bounds expired before the Stellar consensus network could include the transaction in a ledger.
- **Recovery Action:** Check your transaction history to ensure it did not clear, then resubmit with a fresh timeout window.
- **Solution:** Set a longer timeout window (e.g. 60–120 seconds) when building transactions during congestion.

### Error: `tx_bad_auth`

- **Friendly Message:** "Transaction signature invalid"
- **Cause:** The transaction signature was rejected because it does not match the account public key or lacks threshold weight.
- **Recovery Action:** Verify your wallet connection and ensure you are signing with the correct account.
- **Solution:** Ensure the signer key matches the source account or possesses sufficient multisig weight.

### Error: `op_no_destination`

- **Friendly Message:** "Destination account does not exist"
- **Cause:** The destination account is not active or funded on the Stellar ledger.
- **Recovery Action:** Send at least 1 XLM to the destination account first to create and activate it.
- **Solution:** Use a Create Account operation rather than a Payment operation when sending to an uninitialized key.

### Error: `op_low_reserve`

- **Friendly Message:** "Account reserve too low"
- **Cause:** The operation would decrease the source account balance below the network base reserve.
- **Recovery Action:** Deposit more XLM or close unneeded offers/trustlines to free reserve capacity.
- **Solution:** Maintain a safety buffer of at least 2–5 XLM above the minimum reserve.

### Error: `op_line_full`

- **Friendly Message:** "Trustline limit exceeded"
- **Cause:** Receiving account trustline cannot hold the payment amount without exceeding its configured limit.
- **Recovery Action:** Increase the trustline limit or transfer a smaller token amount.
- **Solution:** Issue a `ChangeTrust` operation with a higher limit.

### Error: `op_no_trust`

- **Friendly Message:** "Asset trustline missing"
- **Cause:** Receiving account does not have a trustline established for the custom token.
- **Recovery Action:** Add a trustline for the token in the receiving wallet before transferring.
- **Solution:** Ensure recipient submits a `ChangeTrust` operation prior to transferring asset.


---

## 3. Build & Runtime Errors

### Error: `Uncaught ReferenceError: Buffer is not defined`

- **Cause:** Node.js `Buffer` global missing in browser environment during cryptographic operations.
- **Solution:** Ensure `import { Buffer } from 'buffer'` polyfill is loaded before Stellar SDK operations (handled in `src/main.tsx`).

### Error: `WebGL context was lost`

- **Cause:** GPU out of memory or driver reset triggered by background GPU load.
- **Solution:** Reload the window. The application includes a `WebGLContextHandler` that automatically re-initializes Three.js scenes upon context restoration.
