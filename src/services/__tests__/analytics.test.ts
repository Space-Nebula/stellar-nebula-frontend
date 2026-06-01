import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ANALYTICS_OPT_OUT_KEY,
  AnalyticsTracker,
  sanitizeAnalyticsPayload,
} from '../analytics'

describe('AnalyticsTracker', () => {
  beforeEach(() => {
    vi.useRealTimers()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sanitizes payload keys that could contain PII', () => {
    expect(
      sanitizeAnalyticsPayload({
        walletAddress: 'GSECRET',
        publicKey: 'GPUB',
        upgradeId: 'cargo-expansion',
        durationMs: 120,
        success: true,
      })
    ).toEqual({
      upgradeId: 'cargo-expansion',
      durationMs: 120,
      success: true,
    })
  })

  it('queues events and flushes batches without an endpoint', async () => {
    const tracker = new AnalyticsTracker({ batchSize: 3, endpoint: null })

    tracker.track('scan_started', { pointId: 'scan-1' })
    tracker.track('scan_completed', { pointId: 'scan-1', amount: 50 })

    expect(tracker.getQueue()).toHaveLength(2)
    await expect(tracker.flush()).resolves.toEqual([
      expect.objectContaining({ name: 'scan_started' }),
      expect.objectContaining({ name: 'scan_completed' }),
    ])
    expect(tracker.getQueue()).toHaveLength(0)
  })

  it('respects the local opt-out preference', () => {
    const tracker = new AnalyticsTracker()

    tracker.setOptOut(true)

    expect(localStorage.getItem(ANALYTICS_OPT_OUT_KEY)).toBe('true')
    expect(tracker.track('upgrade_started', { upgradeId: 'deep-scan-array' })).toBeNull()
    expect(tracker.getQueue()).toHaveLength(0)
  })

  it('posts batches to a configured endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      configurable: true,
    })
    const tracker = new AnalyticsTracker({ endpoint: '/analytics', batchSize: 10 })

    tracker.track('performance_metric', { metric: 'fps', value: 60 })

    await expect(tracker.flush()).resolves.toEqual([
      expect.objectContaining({ name: 'performance_metric' }),
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      '/analytics',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      })
    )
  })

  it('requeues events when delivery fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      configurable: true,
    })
    const tracker = new AnalyticsTracker({ endpoint: '/analytics' })

    tracker.track('error_reported', { reason: 'offline' })

    await expect(tracker.flush()).resolves.toEqual([])
    expect(tracker.getQueue()).toEqual([expect.objectContaining({ name: 'error_reported' })])
  })
})
