/**
 * Store Performance Monitor — Zustand middleware for tracking store
 * update frequency, measuring render impact, and logging slow updates.
 *
 * Usage:
 *   import { createPerformanceMonitor } from './storePerformanceMonitor'
 *
 *   const monitor = createPerformanceMonitor('gameStore')
 *
 *   export const useGameStore = create<GameStore>()(
 *     monitor.middleware(
 *       devtools(
 *         persist((set, get) => ({ ... }), { name: 'game' })
 *       )
 *     )
 *   )
 *
 *   // Periodically flush metrics to the monitoring backend
 *   monitor.startPeriodicFlush()
 */

import { addMonitoringBreadcrumb } from '@/services/monitoring'
import { createScopedLogger } from '@/services/logging'

const log = createScopedLogger('StorePerformance')

export interface StorePerformanceConfig {
  /** Store name used in logs and metrics. */
  storeName: string
  /** Time window in ms for frequency counting (default: 60 000). */
  windowMs?: number
  /** Log a warning when a single update exceeds this duration in ms (default: 16). */
  slowUpdateThresholdMs?: number
  /** Maximum number of update timestamps to retain per window (default: 500). */
  maxSamples?: number
  /** Flush interval in ms for periodic breadcrumb reporting (default: 300 000). */
  flushIntervalMs?: number
  /** Enable/disable the monitor entirely (default: true in non-production). */
  enabled?: boolean
}

export interface StorePerformanceMetrics {
  /** Total number of updates in the current window. */
  updateCount: number
  /** Average update duration in ms across sampled updates. */
  avgUpdateDurationMs: number
  /** Maximum update duration in the current window. */
  maxUpdateDurationMs: number
  /** Number of updates that exceeded the slow threshold. */
  slowUpdateCount: number
  /** Update frequency: updates per second averaged over the window. */
  updatesPerSecond: number
  /** Window start timestamp. */
  windowStart: number
}

interface UpdateRecord {
  timestamp: number
  durationMs: number
}

const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'

/**
 * Create a performance monitor for a Zustand store.
 *
 * The returned `middleware` wraps the Zustand `set` function to time every
 * state update and track frequency. The `startPeriodicFlush` method sends
 * aggregated metrics to the monitoring backend at a configurable interval.
 */
export function createPerformanceMonitor(config: StorePerformanceConfig) {
  const {
    storeName,
    windowMs = 60_000,
    slowUpdateThresholdMs = 16,
    maxSamples = 500,
    flushIntervalMs = 300_000,
    enabled = !isProd,
  } = config

  let updates: UpdateRecord[] = []
  let slowUpdateCount = 0
  let flushTimer: ReturnType<typeof setInterval> | null = null

  function pruneWindow() {
    const cutoff = Date.now() - windowMs
    updates = updates.filter((r) => r.timestamp >= cutoff)
  }

  function getMetrics(): StorePerformanceMetrics {
    pruneWindow()

    const count = updates.length
    const durations = updates.map((r) => r.durationMs)
    const totalDuration = durations.reduce((a, b) => a + b, 0)
    const elapsedSec = windowMs / 1000

    return {
      updateCount: count,
      avgUpdateDurationMs: count > 0 ? totalDuration / count : 0,
      maxUpdateDurationMs: count > 0 ? Math.max(...durations) : 0,
      slowUpdateCount,
      updatesPerSecond: count / elapsedSec,
      windowStart: Date.now() - windowMs,
    }
  }

  function flush() {
    pruneWindow()
    const metrics = getMetrics()

    if (metrics.updateCount === 0) return

    addMonitoringBreadcrumb(`Store performance: ${storeName}`, 'store-performance', {
      store: storeName,
      updates: metrics.updateCount,
      avgDurationMs: Math.round(metrics.avgUpdateDurationMs * 100) / 100,
      maxDurationMs: Math.round(metrics.maxUpdateDurationMs * 100) / 100,
      slowUpdates: metrics.slowUpdateCount,
      updatesPerSec: Math.round(metrics.updatesPerSecond * 100) / 100,
    })

    // Reset slow count after flush
    slowUpdateCount = 0
  }

  /**
   * Zustand middleware that wraps the `set` function to measure update timing.
   *
   * Usage with zustand:
   * ```
   * monitor.middleware(
   *   devtools(persist((set, get) => ({ ... }), { name: 'key' }))
   * )
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function middleware(creator: (set: any, get: any, api: any) => any): typeof creator {
    if (!enabled) return creator

    return (set: any, get: any, api: any) => {
      const wrappedSet: typeof set = (...args: any[]) => {
        const start = performance.now()
        set(...args)
        const duration = performance.now() - start

        const now = Date.now()
        updates.push({ timestamp: now, durationMs: duration })

        // Trim to max samples
        if (updates.length > maxSamples) {
          pruneWindow()
          if (updates.length > maxSamples) {
            updates = updates.slice(-maxSamples)
          }
        }

        if (duration > slowUpdateThresholdMs) {
          slowUpdateCount++
          log.warn(`Slow store update in ${storeName}: ${duration.toFixed(2)}ms`, {
            duration,
            threshold: slowUpdateThresholdMs,
          })
        }
      }

      return creator(wrappedSet, get, api)
    }
  }

  /**
   * Start periodic flushing of metrics to the monitoring backend.
   * Call this once after store initialization.
   */
  function startPeriodicFlush() {
    if (!enabled || flushTimer) return
    flushTimer = setInterval(flush, flushIntervalMs)
    log.debug(`Store performance monitor started for ${storeName}`, {
      windowMs,
      slowThresholdMs: slowUpdateThresholdMs,
      flushIntervalMs,
    })
  }

  /**
   * Stop periodic flushing and flush any remaining metrics.
   */
  function stopPeriodicFlush() {
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    flush()
  }

  /**
   * Get current metrics snapshot (useful for debugging/testing).
   */
  function getCurrentMetrics(): StorePerformanceMetrics {
    return getMetrics()
  }

  return {
    middleware,
    startPeriodicFlush,
    stopPeriodicFlush,
    flush,
    getCurrentMetrics,
  }
}
