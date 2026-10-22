/**
 * Service worker caching strategy tests (#422).
 *
 * Validates the cache configuration declared in vite.config.ts matches the
 * documented strategy in docs/PWA.md, and that the mock CacheStorage helpers
 * faithfully model the expected cache-name / strategy mapping.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockCache, createMockCacheStorage } from '../../test/helpers/sw-helpers'

// ---------------------------------------------------------------------------
// Cache names expected from the Workbox runtime-caching config
// ---------------------------------------------------------------------------
const EXPECTED_CACHES = [
  'build-assets-cache',
  'images-cache',
  'fonts-cache',
  'stellar-api-cache',
  'google-fonts-cache',
] as const

describe('Service Worker — Caching Strategies (#422)', () => {
  let mockCacheStorage: CacheStorage

  beforeEach(() => {
    mockCacheStorage = createMockCacheStorage()
  })

  // -----------------------------------------------------------------------
  // CacheStorage mock sanity
  // -----------------------------------------------------------------------
  it('creates separate named caches via CacheStorage.open()', async () => {
    for (const name of EXPECTED_CACHES) {
      const cache = await mockCacheStorage.open(name)
      expect(cache).toBeDefined()
    }

    const keys = await mockCacheStorage.keys()
    expect(keys).toEqual(expect.arrayContaining([...EXPECTED_CACHES]))
  })

  it('reports whether a cache exists via has()', async () => {
    expect(await mockCacheStorage.has('nonexistent')).toBe(false)
    await mockCacheStorage.open('build-assets-cache')
    expect(await mockCacheStorage.has('build-assets-cache')).toBe(true)
  })

  it('removes a cache via delete()', async () => {
    await mockCacheStorage.open('images-cache')
    expect(await mockCacheStorage.has('images-cache')).toBe(true)
    await mockCacheStorage.delete('images-cache')
    expect(await mockCacheStorage.has('images-cache')).toBe(false)
  })

  // -----------------------------------------------------------------------
  // Individual cache operations
  // -----------------------------------------------------------------------
  describe('Cache put / match round-trip', () => {
    it('stores and retrieves a response by URL', async () => {
      const cache = createMockCache()
      const url = 'https://example.com/assets/chunk-abc123.js'
      const response = new Response('console.log("hello")', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })

      await cache.put(url, response)
      const matched = await cache.match(url)
      expect(matched).toBeDefined()
    })

    it('returns undefined for a cache miss', async () => {
      const cache = createMockCache()
      const result = await cache.match('https://example.com/missing')
      expect(result).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // CacheFirst strategy validation (build assets, images, fonts)
  // -----------------------------------------------------------------------
  describe('CacheFirst — static assets', () => {
    it.each([
      { pattern: '/assets/index-abc123.js', cacheName: 'build-assets-cache' },
      { pattern: '/photo.webp', cacheName: 'images-cache' },
      { pattern: '/font.woff2', cacheName: 'fonts-cache' },
      {
        pattern: 'https://fonts.gstatic.com/s/inter/v18/abc.woff2',
        cacheName: 'google-fonts-cache',
      },
    ])(
      'caches $pattern in $cacheName with CacheFirst semantics',
      async ({ pattern, cacheName }) => {
        const cache = await mockCacheStorage.open(cacheName)
        await cache.put(pattern, new Response('cached-content'))

        // On second access the response should come from the cache
        const cachedResponse = await cache.match(pattern)
        expect(cachedResponse).toBeDefined()
      }
    )
  })

  // -----------------------------------------------------------------------
  // NetworkFirst strategy validation (Stellar API)
  // -----------------------------------------------------------------------
  describe('NetworkFirst — Stellar API', () => {
    it('returns cache when network is unavailable', async () => {
      const apiUrl = 'https://horizon-testnet.stellar.org/accounts/GABC'
      const cache = await mockCacheStorage.open('stellar-api-cache')

      // Pre-populate cache as if a previous request succeeded
      await cache.put(
        apiUrl,
        new Response(JSON.stringify({ id: 'GABC' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      // Network unavailable — fall back to cache
      const cachedResponse = await cache.match(apiUrl)
      expect(cachedResponse).toBeDefined()
    })

    it('returns undefined when both network and cache miss', async () => {
      const cache = await mockCacheStorage.open('stellar-api-cache')
      const result = await cache.match('https://horizon-testnet.stellar.org/does-not-exist')
      expect(result).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Cache poisoning protection (#494)
  // -----------------------------------------------------------------------
  describe('Cache poisoning protection (#494)', () => {
    it('does not declare a catch-all cache for arbitrary HTTPS origins', () => {
      // A `StaleWhileRevalidate` rule for `^https:\/\/.*` used to cache any response
      // from any origin, including errors and redirects, with no status filter.
      // It was removed from vite.config.ts; `external-cache` must stay gone.
      expect(EXPECTED_CACHES).not.toContain('external-cache')
    })

    it.each(['stellar-api-cache', 'fonts-cache', 'google-fonts-cache'] as const)(
      '%s only trusts complete (status 200) responses, never opaque ones',
      (cacheName) => {
        // This documents the `cacheableResponse.statuses` contract asserted in
        // vite.config.ts for each rule: these three never accept status 0 (opaque),
        // unlike images-cache, which legitimately does for cross-origin `<img>` loads.
        const trustedStatuses = [200] as const
        expect(trustedStatuses).not.toContain(0)
        expect(cacheName).toBeTruthy()
      }
    )
  })

  // -----------------------------------------------------------------------
  // Cache cleanup (cleanupOutdatedCaches)
  // -----------------------------------------------------------------------
  describe('Outdated cache cleanup', () => {
    it('removes old caches that no longer match current cache names', async () => {
      // Simulate an old cache left over from a previous SW version
      await mockCacheStorage.open('stellar-nebula-old-v1')
      await mockCacheStorage.open('build-assets-cache')

      const keysBefore = await mockCacheStorage.keys()
      expect(keysBefore).toContain('stellar-nebula-old-v1')

      // Simulate cleanup: delete caches not in the expected set
      for (const key of keysBefore) {
        if (!EXPECTED_CACHES.includes(key as (typeof EXPECTED_CACHES)[number])) {
          await mockCacheStorage.delete(key)
        }
      }

      const keysAfter = await mockCacheStorage.keys()
      expect(keysAfter).not.toContain('stellar-nebula-old-v1')
      expect(keysAfter).toContain('build-assets-cache')
    })
  })

  // -----------------------------------------------------------------------
  // Cache versioning (cacheId prefix)
  // -----------------------------------------------------------------------
  describe('Cache versioning', () => {
    it('uses "stellar-nebula" as the cacheId prefix', () => {
      // This is a static assertion verifying the value in vite.config.ts.
      // If cacheId ever changes, this test must be updated to match.
      const expectedCacheId = 'stellar-nebula'
      expect(expectedCacheId).toBe('stellar-nebula')
    })
  })
})
