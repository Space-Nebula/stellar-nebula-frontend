/**
 * CSRF protection on state-changing API requests (Issue #311).
 *
 * The API client must attach the CSRF token to every unsafe method
 * (POST/PUT/DELETE/…) and never to safe ones (GET/HEAD/OPTIONS), and must
 * recover by regenerating the token when the server answers 403.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { del, get, post, put } from '../api'
import { clearCsrfTokenForTests, setCsrfToken } from '@/utils/csrf'

function jsonResponse(status = 200, body: unknown = { ok: true }): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('api CSRF protection (Issue #311)', () => {
  beforeEach(() => {
    clearCsrfTokenForTests()
    setCsrfToken('csrf-known-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('injects the CSRF token into POST requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse())
    await post('/ships', { name: 'nebula' })

    const headers = fetchSpy.mock.calls[0]![1]!.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBe('csrf-known-token')
    expect(headers.get('X-XSRF-Token')).toBe('csrf-known-token')
  })

  it('injects the CSRF token into PUT and DELETE requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse())

    await put('/ships/1', { name: 'nebula' })
    await del('/ships/1')

    for (const call of fetchSpy.mock.calls) {
      const headers = call[1]!.headers as Headers
      expect(headers.get('X-CSRF-Token')).toBe('csrf-known-token')
    }
  })

  it('never attaches the CSRF token to GET requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse())
    await get('/ships')

    const headers = fetchSpy.mock.calls[0]![1]!.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBeNull()
    expect(headers.get('X-XSRF-Token')).toBeNull()
  })

  it('generates a token when none exists yet', async () => {
    clearCsrfTokenForTests()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse())
    await post('/ships', { name: 'nebula' })

    const headers = fetchSpy.mock.calls[0]![1]!.headers as Headers
    const token = headers.get('X-CSRF-Token')
    expect(token).toBeTruthy()
    expect(token).not.toBe('csrf-known-token')
  })

  it('refreshes the token and retries once on a CSRF 403', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(403, { error: 'invalid csrf token' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    const result = await post('/ships', { name: 'nebula' })

    expect(result.status).toBe(200)
    expect(result.error).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    const retriedToken = (fetchSpy.mock.calls[1]![1]!.headers as Headers).get('X-CSRF-Token')
    expect(retriedToken).toBeTruthy()
    expect(retriedToken).not.toBe('csrf-known-token')
  })

  it('does not retry indefinitely when the refresh also 403s', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(403))

    const result = await post('/ships', { name: 'nebula' })

    expect(result.status).toBe(403)
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(3)
  })
})
