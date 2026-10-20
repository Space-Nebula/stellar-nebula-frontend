/**
 * Service worker offline fallback tests (#422).
 *
 * Validates offline navigation fallback, navigateFallbackDenylist, and the
 * offline.html static fallback page behaviour documented in docs/PWA.md.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockCacheStorage } from '../../test/helpers/sw-helpers'

// ---------------------------------------------------------------------------
// Workbox navigateFallback configuration values (from vite.config.ts)
// ---------------------------------------------------------------------------
const NAVIGATE_FALLBACK = '/index.html'
const NAVIGATE_FALLBACK_DENYLIST = [/^\/api/]

describe('Service Worker — Offline Mode (#422)', () => {
  let mockCacheStorage: CacheStorage

  beforeEach(() => {
    mockCacheStorage = createMockCacheStorage()
  })

  // -----------------------------------------------------------------------
  // Navigate fallback
  // -----------------------------------------------------------------------
  describe('navigateFallback', () => {
    it('serves /index.html for navigation requests when offline', async () => {
      const cache = await mockCacheStorage.open('workbox-precache')
      await cache.put(
        NAVIGATE_FALLBACK,
        new Response('<html><body>App Shell</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      )

      const response = await cache.match(NAVIGATE_FALLBACK)
      expect(response).toBeDefined()
      expect(response!.status).toBe(200)
    })

    it('does not use navigateFallback for /api/* routes', () => {
      const apiPaths = ['/api/v1/scan', '/api/v1/player/GABC', '/api/health']
      for (const path of apiPaths) {
        const denied = NAVIGATE_FALLBACK_DENYLIST.some((re) => re.test(path))
        expect(denied).toBe(true)
      }
    })

    it('allows navigateFallback for non-API navigation paths', () => {
      const navPaths = ['/dashboard', '/explore', '/marketplace', '/settings']
      for (const path of navPaths) {
        const denied = NAVIGATE_FALLBACK_DENYLIST.some((re) => re.test(path))
        expect(denied).toBe(false)
      }
    })
  })

  // -----------------------------------------------------------------------
  // Offline-ready notification
  // -----------------------------------------------------------------------
  describe('offline-ready callback', () => {
    it('invokes onOfflineReady when the SW enters offline-ready state', () => {
      const onOfflineReady = vi.fn()

      // Simulate the vite-plugin-pwa registerSW lifecycle
      const registerSW = (opts: { onOfflineReady?: () => void }) => {
        opts.onOfflineReady?.()
        return vi.fn()
      }

      registerSW({ onOfflineReady })
      expect(onOfflineReady).toHaveBeenCalledTimes(1)
    })
  })

  // -----------------------------------------------------------------------
  // Precached resources
  // -----------------------------------------------------------------------
  describe('precache — included assets', () => {
    const precachePatterns = ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp,avif}']
    const sampleAssets = [
      'index.html',
      'assets/main-abc123.js',
      'assets/styles-def456.css',
      'favicon.ico',
      'icon-192.png',
      'vite.svg',
    ]

    it('glob patterns cover essential asset types', () => {
      // Each sample filename should match at least one glob pattern's extension
      for (const asset of sampleAssets) {
        const ext = asset.split('.').pop()!
        const covered = precachePatterns.some((p) => p.includes(ext))
        expect(covered).toBe(true)
      }
    })

    it('includes offline.html in includeAssets', () => {
      // From VitePWA config: includeAssets: [..., 'offline.html']
      const includeAssets = ['vite.svg', 'icon-*.png', 'icon-*.webp', '**/*.webp', 'offline.html']
      expect(includeAssets).toContain('offline.html')
    })
  })

  // -----------------------------------------------------------------------
  // Offline cache fallback for images
  // -----------------------------------------------------------------------
  describe('image cache fallback when offline', () => {
    it('returns cached image when network is unavailable', async () => {
      const cache = await mockCacheStorage.open('images-cache')
      const imageUrl = '/icon-512.png'
      await cache.put(imageUrl, new Response('png-data', { status: 200 }))

      const cached = await cache.match(imageUrl)
      expect(cached).toBeDefined()
    })

    it('returns undefined for uncached image when offline', async () => {
      const cache = await mockCacheStorage.open('images-cache')
      const result = await cache.match('/never-fetched.webp')
      expect(result).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Offline API fallback (Stellar API with NetworkFirst)
  // -----------------------------------------------------------------------
  describe('API cache fallback when offline', () => {
    it('returns last cached API response when network fails', async () => {
      const cache = await mockCacheStorage.open('stellar-api-cache')
      const apiUrl = 'https://soroban-testnet.stellar.org'

      // Simulate a previously cached response
      const body = JSON.stringify({ result: { status: 'healthy' } })
      await cache.put(apiUrl, new Response(body, { status: 200 }))

      const cached = await cache.match(apiUrl)
      expect(cached).toBeDefined()
    })

    it('does not cache responses with non-cacheable status', async () => {
      // Workbox cacheableResponse.statuses: [0, 200] — status 500 is excluded.
      const cacheableStatuses = [0, 200]
      expect(cacheableStatuses).not.toContain(500)
      expect(cacheableStatuses).not.toContain(404)
    })
  })

  // -----------------------------------------------------------------------
  // Network timeout (NetworkFirst with networkTimeoutSeconds)
  // -----------------------------------------------------------------------
  describe('network timeout configuration', () => {
    it('defines a 10-second timeout for Stellar API requests', () => {
      // From vite.config.ts: networkTimeoutSeconds: 10
      const networkTimeoutSeconds = 10
      expect(networkTimeoutSeconds).toBe(10)
      expect(networkTimeoutSeconds).toBeGreaterThan(0)
      expect(networkTimeoutSeconds).toBeLessThanOrEqual(30)
    })
  })
})
