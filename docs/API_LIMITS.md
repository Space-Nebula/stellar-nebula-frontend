# API Rate Limits

The app limits how fast it sends requests to the Stellar network services it depends on. This protects those services and the user's own session from request floods (for example a stuck retry loop or a user repeatedly clicking "Scan"). It is a client-side courtesy, not a security boundary: a modified client can bypass it, so the hosted endpoints must enforce their own limits.

Tracked in issue #483.

## Limits

Each service has its own token bucket. A bucket holds up to `capacity` requests, and one token is refilled every `1 / refillPerSecond` seconds.

| Bucket | Upstream | Capacity (burst) | Sustained rate | Where it applies |
| :--- | :--- | :---: | :---: | :--- |
| `horizon` | Horizon REST API | 20 | 5 req/s | `fetchAccountTransactions()` in `src/utils/horizon-utils.ts` |
| `rpc` | Soroban RPC | 10 | 2 req/s | `simulateContractTransaction()` in `src/utils/stellar/simulate.ts`, including its retries |

The values live in `RATE_LIMITS` in `src/utils/rate-limiter.ts`. Change them there and update this table.

## How requests are limited

- `withRateLimit(bucket, fn)` runs `fn` if a token is free. Otherwise it rejects with a `RateLimitError` and does not call `fn`.
- Each retry attempt takes its own token, so retries cannot bypass the limit.
- Buckets are per tab and live in memory. A page reload resets them.

## What the user sees

Limits are applied in the hooks and utilities above. When a user-triggered request is rate limited, `useRateLimitedRequest` (`src/hooks/useRateLimitedRequest.ts`):

1. Skips the request, so nothing is sent upstream.
2. Shows a warning toast with the number of seconds to wait.
3. Returns `isLimited: true` and `retryAfterMs` until the wait is over, so a component can disable its button.

Non-rate-limit errors are rethrown unchanged.

### Using the hook

```tsx
const { run, isLimited, retryAfterMs } = useRateLimitedRequest('rpc')

const onScan = async () => {
  const result = await run(() => simulateContractTransaction(xdr))
  if (result === undefined) return // rate limited; the user has been notified
  // use result
}

<button disabled={isLimited} onClick={onScan}>Scan</button>
```

## Degradation

- Every caller of a limited helper shares its bucket, so a burst from one feature can make another feature's call wait.
- Limits never change the data returned. A limited request either runs in full or does not run at all. Callers that do not use `useRateLimitedRequest` receive a `RateLimitError` and must handle it.

## Adding a new limit

1. Add a bucket to `RATE_LIMITS` in `src/utils/rate-limiter.ts`.
2. Wrap the upstream call with `withRateLimit('<bucket>', () => ...)`, or use `useRateLimitedRequest` for user actions.
3. Add a row to the table above.

## Related

- [API_INTEGRATION.md](./API_INTEGRATION.md) for how the clients are created.
- [SECURITY.md](./SECURITY.md) for the wider threat model.
