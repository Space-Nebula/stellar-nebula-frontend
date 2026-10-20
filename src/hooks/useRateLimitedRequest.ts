import { useCallback, useMemo, useState } from 'react'
import { RateLimitError, RateLimiter, type RateLimitOptions } from '@/utils/rate-limiter'

/** Default for Horizon and contract calls: bursts of 10, then 1 request per second. */
export const DEFAULT_RATE_LIMIT: RateLimitOptions = { capacity: 10, refillPerSecond: 1 }

/**
 * Wraps an async request so it is rate limited (#483).
 *
 * `request` must be stable across renders (wrap it in `useCallback`), otherwise
 * `run` changes identity on every render. When the limit is hit, `run` rejects with
 * a `RateLimitError` and `retryAfterMs` is set so the UI can show a countdown.
 */
export function useRateLimitedRequest<TArgs extends unknown[], TResult>(
  request: (...args: TArgs) => Promise<TResult>,
  options: RateLimitOptions = DEFAULT_RATE_LIMIT
) {
  const { capacity, refillPerSecond } = options
  const limiter = useMemo(
    () => new RateLimiter({ capacity, refillPerSecond }),
    [capacity, refillPerSecond]
  )
  const [retryAfterMs, setRetryAfterMs] = useState(0)

  const run = useCallback(
    (...args: TArgs): Promise<TResult> => {
      const result = limiter.tryAcquire()
      if (!result.allowed) {
        setRetryAfterMs(result.retryAfterMs)
        return Promise.reject(new RateLimitError(result.retryAfterMs))
      }
      return request(...args)
    },
    [limiter, request]
  )

  return { run, retryAfterMs }
}
