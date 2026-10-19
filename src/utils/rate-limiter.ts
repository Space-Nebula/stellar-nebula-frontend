/**
 * Client-side token-bucket rate limiter (#483).
 *
 * Stops a single browser tab from flooding Horizon or the Soroban RPC with requests
 * (which would degrade the app for the user and run up costs on hosted endpoints).
 * Limits are per bucket, so a burst of contract simulations does not block account
 * lookups, and vice versa.
 *
 * Limits are a courtesy to the upstream services, not a security control: anything
 * enforced here can be bypassed by a modified client, so server-side limits still apply.
 */

interface RateLimitConfig {
  /** Maximum number of requests that can be made back-to-back. */
  capacity: number
  /** Tokens added back per second, so the sustained request rate is bounded. */
  refillPerSecond: number
}

/** Limits per upstream service. Documented in docs/API_LIMITS.md. */
const RATE_LIMITS = {
  horizon: { capacity: 20, refillPerSecond: 5 },
  rpc: { capacity: 10, refillPerSecond: 2 },
} satisfies Record<string, RateLimitConfig>

export type RateLimitBucket = keyof typeof RATE_LIMITS

export class RateLimitError extends Error {
  readonly bucket: string
  readonly retryAfterMs: number

  constructor(bucket: string, retryAfterMs: number) {
    super(`Rate limit exceeded for ${bucket}. Retry in ${Math.ceil(retryAfterMs / 1000)}s.`)
    this.name = 'RateLimitError'
    this.bucket = bucket
    this.retryAfterMs = retryAfterMs
  }
}

class TokenBucket {
  readonly name: string
  private readonly config: RateLimitConfig
  private readonly now: () => number
  private tokens: number
  private lastRefill: number

  constructor(name: string, config: RateLimitConfig, now: () => number = Date.now) {
    this.name = name
    this.config = config
    this.now = now
    this.tokens = config.capacity
    this.lastRefill = now()
  }

  /** Tokens currently available, after refilling for the time elapsed. */
  get available(): number {
    this.refill()
    return this.tokens
  }

  /**
   * Takes one token if one is free.
   * Returns 0 when the request may proceed, otherwise the wait in ms until a token is free.
   */
  tryTake(): number {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return 0
    }
    return Math.ceil(((1 - this.tokens) / this.config.refillPerSecond) * 1000)
  }

  /** Takes one token or throws a RateLimitError describing how long to wait. */
  acquire(): void {
    const retryAfterMs = this.tryTake()
    if (retryAfterMs > 0) {
      throw new RateLimitError(this.name, retryAfterMs)
    }
  }

  private refill(): void {
    const current = this.now()
    const elapsedSeconds = (current - this.lastRefill) / 1000
    this.tokens = Math.min(
      this.config.capacity,
      this.tokens + elapsedSeconds * this.config.refillPerSecond
    )
    this.lastRefill = current
  }
}

const buckets = new Map<RateLimitBucket, TokenBucket>()

/** Returns the shared bucket for an upstream service, creating it on first use. */
function getRateLimiter(bucket: RateLimitBucket): TokenBucket {
  let limiter = buckets.get(bucket)
  if (!limiter) {
    limiter = new TokenBucket(bucket, RATE_LIMITS[bucket])
    buckets.set(bucket, limiter)
  }
  return limiter
}

/**
 * Runs `fn` if the bucket has capacity, otherwise rejects with a RateLimitError
 * without calling `fn`. Callers decide how to degrade (see useRateLimitedRequest).
 */
export function withRateLimit<T>(bucket: RateLimitBucket, fn: () => Promise<T>): Promise<T> {
  try {
    getRateLimiter(bucket).acquire()
  } catch (error) {
    return Promise.reject(error)
  }
  return fn()
}
