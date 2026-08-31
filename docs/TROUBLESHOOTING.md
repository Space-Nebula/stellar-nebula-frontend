# Troubleshooting Guide

This guide covers the most common wallet, transaction, contract, and rendering problems in Stellar Nebula. When reporting an issue, include the error code, network, wallet type, browser, and transaction hash when one is available. Never include a seed phrase, private key, or signed XDR containing sensitive data.

## Quick Checks

1. Confirm the selected network matches the wallet network: Testnet, Futurenet, or Mainnet.
2. Confirm the wallet extension or Albedo is installed and unlocked.
3. Check the browser console and monitoring event for the matching code in [ERROR_CODES.md](ERROR_CODES.md).
4. Retry only network and timeout failures. Do not repeatedly retry a rejected signing request or an on-chain failure.
5. Check the configured RPC endpoint and current network status before escalating.

## Wallet Connection Failures

### Wallet is not detected

- Install or enable Freighter, or make Albedo available in the current browser environment.
- Refresh the page after installing an extension.
- Disable competing wallet extensions temporarily if the wrong provider is being selected.
- Confirm the site is allowed to access the wallet extension.

### Connection is rejected

- Unlock the wallet and approve the connection request in its own UI.
- Verify the wallet account is the expected public key before continuing.
- A rejected request is not a network failure; reconnect only after the user intentionally retries.

### The app reconnects to the wrong account or network

- Disconnect from the app and wallet, then connect again.
- Confirm the active wallet account and network before signing.
- The app validates the persisted public key for Freighter. A changed key or unavailable wallet invalidates the saved session.
- Clear the site storage only as a last resort; this removes the local wallet session, not wallet funds.

## Transaction Problems

### Signing was cancelled or rejected

The wallet did not return a signed transaction. Reopen the wallet prompt and review the transaction details before approving. Do not treat this as a submission failure and do not retry automatically.

### Signed transaction cannot be parsed

The transaction was signed for a different network passphrase or is otherwise invalid. Reconnect the wallet on the configured network and rebuild the transaction. Confirm that the app and wallet both use the same network.

### Submission returns an error

- Confirm the account has enough XLM for fees and reserves.
- Check the operation parameters, asset issuer, contract ID, and account authorization.
- Record the returned result XDR and map it to the relevant Stellar or contract error before retrying.
- Rebuild the transaction if its timeout or sequence number is stale.

### Transaction remains pending or times out

- Use the transaction hash to check the network explorer or RPC status.
- A timeout does not prove that the transaction failed. Check the network before submitting another transaction.
- If the status is `NOT_FOUND`, wait briefly and check again. Do not create duplicate actions while the original may still be in flight.
- Network, fetch, HTTP 429, and HTTP 5xx failures may be retried with exponential backoff.

### Transaction failed on-chain

The network processed the transaction but rejected an operation. Review the result XDR and input values. Rebuilding with the same values without addressing the on-chain reason is unlikely to help.

## Contract and Scan Failures

- `Contract returned no value` means the successful response did not contain the expected return value.
- `Unable to decode contract return value` means the response XDR could not be converted to the expected application value.
- Confirm the contract ID and network configuration before investigating application logic.
- Capture the transaction hash, contract ID, network, and error code for support. Do not log private keys or wallet secrets.

## Three.js and WebGL Performance

### Low frame rate or stuttering

- Enable the application performance mode and reduce nebula density.
- Close other GPU-heavy tabs and disable browser extensions that inject page content.
- Test with hardware acceleration enabled in the browser.
- Check device pixel ratio and GPU usage; high-resolution displays increase rendering cost.
- Reduce the number of open canvases and avoid leaving multiple nebula views mounted.

### Blank or missing 3D scene

- Check whether WebGL is available in the browser and whether hardware acceleration is blocked.
- Reload after updating the browser or graphics driver.
- Check the console for shader compilation, model loading, or context-loss errors.
- If the WebGL context was lost, reload the page and report the browser, GPU, and scene state.

## Escalation Checklist

Include:

- Error code and user-facing message
- Network and wallet type
- Browser and operating system
- Timestamp and transaction hash, if available
- Whether the failure is reproducible
- Relevant monitoring event or sanitized console output
