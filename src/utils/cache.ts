export interface CacheStats {
  hits: number
  misses: number
  keys: number
}

export interface CacheOptions {
  ttlMs?: number
  maxEntries?: number
}

type Entry<T> = { value: T; expiresAt: number }

/**
 * Simple in-memory TTL cache.
 *
 * Automatically evicts expired entries and drops the oldest entry
 * when the max size is reached.
 *
 * @example
 * const cache = new SimpleCache<string>({ ttlMs: 5000 })
 * cache.set('key', 'value')
 * cache.get('key') // 'value'
 */
export class SimpleCache<T = any> {
  private map = new Map<string, Entry<T>>()
  private ttlMs: number
  private maxEntries: number
  private hits = 0
  private misses = 0

  constructor(opts: CacheOptions = {}) {
    this.ttlMs = opts.ttlMs ?? 30000
    this.maxEntries = opts.maxEntries ?? 1000
  }

  /** Store a value with an optional per-entry TTL. */
  set(key: string, value: T, ttlMs?: number) {
    this.pruneExpired()
    if (this.map.size >= this.maxEntries) {
      const first = this.map.keys().next().value
      this.map.delete(first)
    }
    this.map.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.ttlMs) })
  }

  /** Retrieve a value, or null if missing or expired. */
  get(key: string): T | null {
    const entry = this.map.get(key)
    if (!entry) {
      this.misses++
      return null
    }
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key)
      this.misses++
      return null
    }
    this.hits++
    return entry.value
  }

  /** Remove a specific key from the cache. */
  delete(key: string) {
    this.map.delete(key)
  }

  /** Clear all entries and reset stats. */
  clear() {
    this.map.clear()
    this.hits = 0
    this.misses = 0
  }

  /** Remove all expired entries. */
  pruneExpired() {
    const now = Date.now()
    for (const [k, v] of Array.from(this.map.entries())) {
      if (v.expiresAt <= now) this.map.delete(k)
    }
  }

  /** Get cache hit/miss statistics. */
  stats(): CacheStats {
    return { hits: this.hits, misses: this.misses, keys: this.map.size }
  }
}

export default SimpleCache
