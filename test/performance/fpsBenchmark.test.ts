import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateFps, createFpsBenchmark } from '../../src/utils/performance/fpsBenchmark'

describe('fpsBenchmark utilities', () => {
  const originalNow = performance.now.bind(performance)

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    performance.now = originalNow
  })

  it('calculates FPS from frame counts and elapsed time', () => {
    expect(calculateFps(60, 1000)).toBe(60)
    expect(calculateFps(30, 500)).toBe(60)
  })

  it('records benchmark samples and detects sustained rendering performance', () => {
    const benchmark = createFpsBenchmark({ targetFps: 60, sampleWindowMs: 1000 })

    benchmark.recordFrame(0)
    benchmark.recordFrame(16)
    benchmark.recordFrame(32)
    benchmark.recordFrame(48)
    benchmark.recordFrame(64)

    const sample = benchmark.sample()

    expect(sample.fps).toBe(63)
    expect(sample.averageFps).toBe(63)
    expect(sample.isWithinTarget).toBe(true)
  })

  it('flags performance regressions when average FPS drops below threshold', () => {
    const benchmark = createFpsBenchmark({ targetFps: 60, sampleWindowMs: 1000 })

    benchmark.recordFrame(0)
    benchmark.recordFrame(200)
    benchmark.recordFrame(400)
    benchmark.recordFrame(600)
    benchmark.recordFrame(800)

    const sample = benchmark.sample()

    expect(sample.fps).toBe(5)
    expect(sample.averageFps).toBe(5)
    expect(sample.isWithinTarget).toBe(false)
  })
})
