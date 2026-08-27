# Error Code Reference

Use these stable codes when reporting, monitoring, and triaging failures. User-facing messages may change; the code should remain stable. Error details such as result XDR must be sanitized before logging or sharing.

## Wallet and Session Errors

| Code | Meaning | Recommended action |
| --- | --- | --- |
| `WALLET_NOT_INSTALLED` | The requested wallet provider is unavailable. | Install or enable the provider, then reconnect. |
| `WALLET_UNAVAILABLE` | The wallet cannot be used in the current browser environment. | Check the browser, extension, and provider availability. |
| `WALLET_CONNECTION_REJECTED` | The user or wallet rejected the connection request. | Ask the user to reconnect and approve intentionally. |
| `WALLET_SESSION_EXPIRED` | A persisted session could not be validated. | Clear the stale session and reconnect. |
| `WALLET_ACCOUNT_MISMATCH` | The current wallet account differs from the persisted account. | Confirm the account and reconnect. |
| `WALLET_NETWORK_MISMATCH` | Wallet and application network passphrases differ. | Switch both sides to the intended network and rebuild. |
| `WALLET_NOT_CONNECTED` | A signing action was attempted without an active wallet. | Connect a supported wallet first. |
| `WALLET_SIGNING_REJECTED` | The wallet cancelled or rejected transaction signing. | Do not auto-retry; review and resubmit only after user approval. |

## Transaction Errors

| Code | Meaning | Recommended action |
| --- | --- | --- |
| `TRANSACTION_BUILD_FAILED` | The unsigned transaction could not be created or prepared. | Check account, contract, operation parameters, and network. |
| `TRANSACTION_PARSE_FAILED` | Signed XDR could not be parsed for the selected network. | Reconnect on the correct network and rebuild. |
| `TRANSACTION_SUBMISSION_FAILED` | RPC rejected submission or returned an error result. | Inspect sanitized result details and validate the transaction. |
| `TRANSACTION_HASH_MISSING` | Submission did not return a transaction hash. | Check RPC health and avoid assuming the transaction was accepted. |
| `TRANSACTION_PENDING` | The network accepted the request but confirmation is not final. | Poll by hash and prevent duplicate submission. |
| `TRANSACTION_NOT_FOUND` | A submitted hash was not found during polling. | Check the network again before deciding whether to resubmit. |
| `TRANSACTION_CONFIRMATION_TIMEOUT` | Confirmation did not arrive within the polling window. | Check by hash; treat the final state as unknown until verified. |
| `TRANSACTION_ON_CHAIN_FAILED` | The network processed and failed the transaction. | Inspect result XDR and correct the operation inputs. |
| `TRANSACTION_DUPLICATE` | The network or client identified a duplicate submission. | Check the original transaction by hash. |
| `TRANSACTION_UNEXPECTED_STATUS` | RPC returned a status the client does not handle. | Record the status and investigate the RPC response. |

## Contract and Response Errors

| Code | Meaning | Recommended action |
| --- | --- | --- |
| `CONTRACT_SUBMISSION_FAILED` | A contract transaction was rejected during submission. | Inspect the sanitized result XDR and contract inputs. |
| `CONTRACT_ON_CHAIN_FAILED` | A contract transaction failed after submission. | Review contract authorization, state, and operation values. |
| `CONTRACT_RETURN_VALUE_MISSING` | A successful contract response had no return value. | Verify contract version, method, and network. |
| `CONTRACT_RESPONSE_DECODE_FAILED` | Contract response XDR could not be decoded. | Verify the response schema and SDK compatibility. |
| `SIMULATION_FAILED` | Contract simulation returned an error. | Review simulation error, authorization, and resource requirements. |

## Network and Infrastructure Errors

| Code | Meaning | Recommended action |
| --- | --- | --- |
| `RPC_NETWORK_ERROR` | RPC, fetch, or connection failure occurred. | Check endpoint health and retry with bounded backoff. |
| `RPC_RATE_LIMITED` | The endpoint returned HTTP 429 or equivalent throttling. | Back off, reduce request frequency, and retry later. |
| `RPC_SERVER_ERROR` | The endpoint returned an HTTP 5xx response. | Retry after backoff and check provider status. |
| `CONFIGURATION_INVALID` | Required runtime configuration is missing or invalid. | Correct deployment environment values and rebuild. |
| `WEBGL_UNAVAILABLE` | The browser could not create or maintain a WebGL context. | Enable hardware acceleration, update the browser, or use a supported device. |
| `RENDERING_PERFORMANCE_DEGRADED` | Rendering exceeds the device's practical frame budget. | Enable performance mode and reduce scene density. |

## Mapping Existing Messages

The current implementation often throws plain `Error` or `ContractError` messages. Until typed codes are added to the runtime error classes, map messages to the closest code above at the logging or support boundary. When introducing a new runtime error, preserve the user-facing message and add the corresponding stable code to this document and its tests.
