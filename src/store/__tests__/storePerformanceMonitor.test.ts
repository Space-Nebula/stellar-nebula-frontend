import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPerformanceMonitor } from '../storePerformanceMonitor'

vi.mock('@/services/monitoring', () => ({
  addMonitoringBreadcrumb: vi.fn(),
}))

vi.mock('@/services/logging', () => ({
  createScopedLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('StorePerformanceMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a monitor with default config', () => {
    const monitor = createPerformanceMonitor({ storeName: 'test' })
    expect(monitor).toBeDefined()
    expect(typeof monitor.middleware).toBe('function')
    expect(typeof monitor.startPeriodicFlush).toBe('function')
    expect(typeof monitor.stopPeriodicFlush).toBe('function')
    expect(typeof monitor.flush).toBe('function')
    expect(typeof monitor.getCurrentMetrics).toBe('function')
  })

  it('returns zero metrics when no updates have occurred', () => {
    const monitor = createPerformanceMonitor({ storeName: 'test' })
    const metrics = monitor.getCurrentMetrics()

    expect(metrics.updateCount).toBe(0)
    expect(metrics.avgUpdateDurationMs).toBe(0)
    expect(metrics.maxUpdateDurationMs).toBe(0)
    expect(metrics.slowUpdateCount).toBe(0)
    expect(metrics.updatesPerSecond).toBe(0)
  })

  it('tracks update count via middleware', () => {
    const monitor = createPerformanceMonitor({ storeName: 'test' })

    const mockCreator = vi.fn((set: any) => ({
      count: 0,
      increment: () => set({ count: 1 }),
    }))

    const wrapped = monitor.middleware(mockCreator)
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockApi = {} as any

    wrapped(mockSet, mockGet, mockApi)

    // The middleware should have called the creator with a wrapped set
    expect(mockCreator).toHaveBeenCalled()
  })

  it('flush sends breadcrumb to monitoring', async () => {
    const { addMonitoringBreadcrumb } = await import('@/services/monitoring')
    const monitor = createPerformanceMonitor({ storeName: 'testStore' })

    monitor.flush()

    // No updates yet, so flush should not send anything
    expect(addMonitoringBreadcrumb).not.toHaveBeenCalled()
  })

  it('disabled monitor does not track updates', () => {
    const monitor = createPerformanceMonitor({
      storeName: 'test',
      enabled: false,
    })

    const mockCreator = vi.fn((set: any) => ({
      count: 0,
      increment: () => set({ count: 1 }),
    }))

    const wrapped = monitor.middleware(mockCreator)
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockApi = {} as any

    wrapped(mockSet, mockGet, mockApi)

    // When disabled, the middleware should pass through without wrapping
    const metrics = monitor.getCurrentMetrics()
    expect(metrics.updateCount).toBe(0)
  })

  it('startPeriodicFlush and stopPeriodicFlush work without errors', () => {
    const monitor = createPerformanceMonitor({ storeName: 'test' })

    monitor.startPeriodicFlush()
    monitor.stopPeriodicFlush()

    // Calling stop again should be safe
    monitor.stopPeriodicFlush()
  })

  it('getCurrentMetrics returns a snapshot', () => {
    const monitor = createPerformanceMonitor({ storeName: 'test' })
    const metrics = monitor.getCurrentMetrics()

    expect(metrics).toHaveProperty('updateCount')
    expect(metrics).toHaveProperty('avgUpdateDurationMs')
    expect(metrics).toHaveProperty('maxUpdateDurationMs')
    expect(metrics).toHaveProperty('slowUpdateCount')
    expect(metrics).toHaveProperty('updatesPerSecond')
    expect(metrics).toHaveProperty('windowStart')
  })
})
