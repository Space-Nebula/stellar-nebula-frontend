/**
 * Client-side rate limiter (#483).
 *
 * A token bucket: the bucket holds up to `capacity` tokens and refills at
 * `refillPerSecond`. Each request spends one token. When the bucket is empty the
 * caller gets the wait time instead, so the app degrades gracefully rather than
 * flooding Horizon or the Soroban RPC. See docs/API_LIMITS.md.
 */

export interface RateLimitOptions {
  /** Maximum burst size, in requests. */
  capacity: number
  /** Tokens added back per second. */
  refillPerSecond: number
  /** Clock in milliseconds. Injectable so tests can control time. */
  now?: () => number
}

export interface RateLimitResult {
  allowed: boolean
  /** Milliseconds until the next request is allowed. 0 when allowed. */
  retryAfterMs: number
}

/** Thrown by rate-limited calls when the bucket is empty. */
export class RateLimitError extends Error {
  readonly retryAfterMs: number

  constructor(retryAfterMs: number) {
    super(`Too many requests. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`)
    this.name = 'RateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

export class RateLimiter {
  private tokens: number
  private lastRefill: number
  private readonly capacity: number
  private readonly refillPerSecond: number
  private readonly now: () => number

  constructor(options: RateLimitOptions) {
    if (options.capacity <= 0 || options.refillPerSecond <= 0) {
      throw new Error('RateLimiter capacity and refillPerSecond must be greater than 0')
    }
    this.capacity = options.capacity
    this.refillPerSecond = options.refillPerSecond
    this.now = options.now ?? (() => Date.now())
    this.tokens = options.capacity
    this.lastRefill = this.now()
  }

  private refill(): void {
    const current = this.now()
    const elapsedSeconds = Math.max(0, current - this.lastRefill) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillPerSecond)
    this.lastRefill = current
  }

  /** Spends one token if one is available. */
  tryAcquire(): RateLimitResult {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return { allowed: true, retryAfterMs: 0 }
    }
    const missing = 1 - this.tokens
    return {
      allowed: false,
      retryAfterMs: Math.ceil((missing / this.refillPerSecond) * 1000),
    }
  }
}
