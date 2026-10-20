# Client-Side API Rate Limits

This document describes the request limits the frontend applies to its own API traffic (#483).
Without them, a user (or a buggy loop) could flood the public Horizon API or the Soroban RPC,
causing a denial of service for the user and high costs for the endpoints.

## Why client-side limits

Public Stellar endpoints enforce their own server-side limits per IP address. Client-side limits
are a second layer. They keep one tab from exhausting the shared quota, and they fail gracefully
before a server starts returning `429 Too Many Requests`.

Client-side limits are a courtesy and a cost guard. They are not a security boundary, because
anyone can bypass them. Server-side limits remain the real control.

## Implementation

| Piece | File | Role |
| :--- | :--- | :--- |
| Token bucket | `src/utils/rate-limiter.ts` | `RateLimiter` spends one token per request and refills over time. `RateLimitError` carries the wait time. |
| React hook | `src/hooks/useRateLimitedRequest.ts` | Wraps an async request. Rejects with `RateLimitError` and exposes `retryAfterMs` for UI. |

## Default limits

| Setting | Value | Meaning |
| :--- | :--- | :--- |
| `capacity` | 10 | Up to 10 requests in a burst |
| `refillPerSecond` | 1 | After the burst, one request per second (about 3,600 per hour) |

The default is set in `DEFAULT_RATE_LIMIT` in `src/hooks/useRateLimitedRequest.ts`. It is chosen to
sit under the public Horizon per-IP limit. Check the current Horizon documentation before changing it.

## User-facing behavior

- Requests within the limit run immediately.
- When the bucket is empty, the request is rejected with a `RateLimitError`. The caller should show
  a message such as "Too many requests. Try again in 3s." using `retryAfterMs`.
- The limit recovers on its own. No action is needed from the user.
- Nothing is sent to the network for a rejected request, so there is no retry storm.

## Usage

```ts
const fetchAccount = useCallback((publicKey: string) => server.loadAccount(publicKey), [server])
const { run, retryAfterMs } = useRateLimitedRequest(fetchAccount)

try {
  const account = await run(publicKey)
} catch (error) {
  if (error instanceof RateLimitError) {
    // Show the countdown from error.retryAfterMs
  }
}
```

## Adding a limited endpoint

1. Wrap the request in `useCallback` so its identity is stable.
2. Pass it to `useRateLimitedRequest`, with custom `capacity` and `refillPerSecond` if the default does not fit.
3. Handle `RateLimitError` in the calling component.
4. Update the table above if you change a default.

## Limitations

- The bucket lives in memory. A page reload resets it, which is acceptable for a client-side guard.
- The limit is per tab. Two tabs each get their own bucket, so server-side limits still apply.
