/**
 * GET response caching for the API client (Issue #307).
 *
 * Covers the cache-control contract (no-store / no-cache / max-age),
 * key normalization, invalidation after mutations, and the bypass escape
 * hatch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get, post } from '../api'
import { __resetApiCacheForTests, parseCacheControl, cacheKeyFor } from '@/utils/apiCache'

function jsonResponse(
  status = 200,
  body: unknown = { ok: true },
  cacheControl?: string
): Response {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (cacheControl) headers.set('cache-control', cacheControl)
  return new Response(JSON.stringify(body), { status, headers })
}

describe('parseCacheControl (Issue #307)', () => {
  it('falls back to the default TTL with no header', () => {
    expect(parseCacheControl(null, 30_000)).toEqual({ directive: 'store', ttlMs: 30_000 })
  })

  it('honors max-age', () => {
    expect(parseCacheControl('max-age=60', 30_000)).toEqual({ directive: 'store', ttlMs: 60_000 })
  })

  it('never stores no-store or private responses', () => {
    expect(parseCacheControl('no-store', 30_000).directive).toBe('no-store')
    expect(parseCacheControl('private, max-age=60', 30_000).directive).toBe('no-store')
  })

  it('treats no-cache and max-age=0 as uncacheable', () => {
    expect(parseCacheControl('no-cache', 30_000)).toEqual({ directive: 'no-cache', ttlMs: 0 })
    expect(parseCacheControl('max-age=0', 30_000)).toEqual({ directive: 'no-cache', ttlMs: 0 })
  })

  it('caps a hostile max-age at ten minutes', () => {
    expect(parseCacheControl('max-age=86400', 30_000).ttlMs).toBe(600_000)
  })
})

describe('cacheKeyFor (Issue #307)', () => {
  it('normalizes query parameter order', () => {
    expect(cacheKeyFor('/ships', 'b=2&a=1')).toBe('/ships?a=1&b=2')
    expect(cacheKeyFor('/ships', 'a=1&b=2')).toBe('/ships?a=1&b=2')
  })

  it('returns the bare path when there is no query', () => {
    expect(cacheKeyFor('/ships', '')).toBe('/ships')
  })
})

describe('api GET caching (Issue #307)', () => {
  beforeEach(() => {
    __resetApiCacheForTests()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serves a repeated GET from cache without a second network call', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { ships: ['a'] }, 'max-age=60'))

    const first = await get<{ ships: string[] }>('/ships')
    const second = await get<{ ships: string[] }>('/ships')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(first.data).toEqual(second.data)
  })

  it('does not cache a no-store response', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { ships: [] }, 'no-store'))

    await get('/ships')
    await get('/ships')

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('does not cache error responses', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(500, { message: 'boom' }, 'max-age=60'))

    await get('/ships')
    await get('/ships')

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('treats different query strings as different entries', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { ok: true }, 'max-age=60'))

    await get('/ships?owner=alice')
    await get('/ships?owner=bob')

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('bypasses the cache when cache:false is passed', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { ok: true }, 'max-age=60'))

    await get('/ships')
    await get('/ships', { cache: false })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('invalidates related reads after a successful mutation', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { ok: true }, 'max-age=60'))

    await get('/ships') // cached
    await post('/ships/1', { name: 'nebula' }) // invalidates /ships + /ships/1
    await get('/ships') // must hit the network again

    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('never serves a cached response to a mutation', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { ok: true }, 'max-age=60'))

    await post('/ships', { name: 'a' })
    await post('/ships', { name: 'b' })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
