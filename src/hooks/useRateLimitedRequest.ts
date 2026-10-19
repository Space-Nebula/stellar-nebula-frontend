import { useCallback, useEffect, useRef, useState } from 'react'
import { RateLimitError, withRateLimit, type RateLimitBucket } from '@/utils/rate-limiter'
import { showToast } from '@/utils/toast'

/**
 * Runs user-triggered requests through a rate-limit bucket (#483).
 *
 * When the bucket is exhausted the request is skipped, the user is told how long to wait,
 * and `isLimited` turns true until the wait is over. Other errors are rethrown unchanged.
 *
 * @example
 * const { run, isLimited } = useRateLimitedRequest('rpc')
 * const result = await run(() => simulateContractTransaction(xdr))
 * if (result === undefined) return // rate limited; the user has already been notified
 */
export function useRateLimitedRequest(bucket: RateLimitBucket) {
  const [retryAfterMs, setRetryAfterMs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await withRateLimit(bucket, fn)
      } catch (error) {
        if (!(error instanceof RateLimitError)) throw error

        const seconds = Math.ceil(error.retryAfterMs / 1000)
        showToast(`Too many requests. Please wait ${seconds}s and try again.`, { type: 'warning' })

        setRetryAfterMs(error.retryAfterMs)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setRetryAfterMs(0), error.retryAfterMs)
        return undefined
      }
    },
    [bucket]
  )

  return { run, isLimited: retryAfterMs > 0, retryAfterMs }
}
