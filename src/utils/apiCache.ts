/**
 * HTTP response cache for API GET requests (Issue #307).
 *
 * Wraps the existing `SimpleCache` TTL/LRU primitive with the semantics the
 * API client needs:
 *   - only safe methods are cached (GET/HEAD/OPTIONS)
 *   - per-entry TTL, overridable by the server via `Cache-Control`
 *     (`max-age` / `s-maxage`), and `no-store` / `no-cache` / `private`
 *     responses are never stored
 *   - bounded size (LRU eviction) so a long session cannot grow unbounded
 *   - in-flight de-duplication, so N concurrent callers for the same key
 *     issue one network request
 *   - explicit invalidation by key or by path prefix, so a write can drop
 *     the reads it affects
 */
import { SimpleCache } from './cache'

export interface CachedResponse<T = unknown> {
  data: T | null
  status: number
}

export interface ApiCacheOptions {
  /** Default TTL when the response carries no usable Cache-Control. */
  ttlMs?: number
  /** Maximum number of cached responses (LRU eviction beyond this). */
  maxEntries?: number
}

const DEFAULT_TTL_MS = 30_000
const DEFAULT_MAX_ENTRIES = 200
/** Cap on a server-provided max-age so a hostile/misconfigured header can't pin a response forever. */
const MAX_TTL_MS = 10 * 60_000

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isCacheableMethod(method?: string): boolean {
  return SAFE_METHODS.has((method ?? 'GET').toUpperCase())
}

export type CacheDirective = 'store' | 'no-store' | 'no-cache' | 'private'

/**
 * Parse the response `Cache-Control` header into a directive plus TTL.
 * Returns `no-store` for `no-store`/`private` and `no-cache` for
 * `no-cache`/`max-age=0` — both mean "do not keep this".
 */
export function parseCacheControl(
  header: string | null,
  fallbackTtlMs: number
): { directive: CacheDirective; ttlMs: number } {
  if (!header) return { directive: 'store', ttlMs: fallbackTtlMs }

  const directives = header
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  if (directives.includes('no-store') || directives.includes('private')) {
    return { directive: 'no-store', ttlMs: 0 }
  }

  const maxAge = directives
    .map((d) => d.match(/^(?:s-maxage|max-age)=(\d+)$/))
    .find(Boolean)?.[1]

  if (directives.includes('no-cache')) return { directive: 'no-cache', ttlMs: 0 }
  if (maxAge !== undefined) {
    const seconds = Number.parseInt(maxAge, 10)
    if (Number.isFinite(seconds)) {
      if (seconds === 0) return { directive: 'no-cache', ttlMs: 0 }
      return { directive: 'store', ttlMs: Math.min(seconds * 1000, MAX_TTL_MS) }
    }
  }

  return { directive: 'store', ttlMs: fallbackTtlMs }
}

/** Normalize a URL/path into a stable cache key (query order independent). */
export function cacheKeyFor(path: string, search?: string): string {
  if (!search) return path
  const params = new URLSearchParams(search)
  params.sort()
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export class ApiCache {
  private cache: SimpleCache<CachedResponse>
  private inflight = new Map<string, Promise<CachedResponse>>()
  private _defaultTtlMs: number

  constructor(opts: ApiCacheOptions = {}) {
    this._defaultTtlMs = opts.ttlMs ?? DEFAULT_TTL_MS
    this.cache = new SimpleCache<CachedResponse>({
      ttlMs: this._defaultTtlMs,
      maxEntries: opts.maxEntries ?? DEFAULT_MAX_ENTRIES,
    })
  }

  /** Default TTL applied when a response carries no usable Cache-Control. */
  get defaultTtlMs(): number {
    return this._defaultTtlMs
  }

  get(key: string): CachedResponse | null {
    return this.cache.get(key)
  }

  set(key: string, value: CachedResponse, ttlMs?: number): void {
    this.cache.set(key, value, ttlMs)
  }

  has(key: string): boolean {
    return this.cache.get(key) != null
  }

  /**
   * De-duplicate concurrent identical reads: the first caller performs the
   * request, everyone else awaits the same promise.
   */
  async dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    if (cached) return cached.data as T

    const existing = this.inflight.get(key)
    if (existing) return (await existing) as T

    const promise = factory()
      .then((data) => {
        return data
      })
      .finally(() => {
        this.inflight.delete(key)
      })
    this.inflight.set(key, promise as Promise<CachedResponse>)
    return (await promise) as T
  }

  /** Drop a single entry. */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /** Drop every entry whose key starts with the given prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key)
    }
  }

  clear(): void {
    this.cache.clear()
    this.inflight.clear()
  }

  stats() {
    return this.cache.stats()
  }
}

/** Process-wide cache used by the API client. */
export const apiCache = new ApiCache()

/** Test seam: reset the shared cache between specs. */
export function __resetApiCacheForTests(): void {
  apiCache.clear()
}
