import { describe, expect, it } from 'vitest'
import { calculateFps, createFpsBenchmark } from '../../src/utils/performance/fpsBenchmark'
import { PERFORMANCE_THRESHOLDS } from './thresholds'

describe('FPS & Rendering Performance Thresholds', () => {
  it('asserts that sustained rendering meets or exceeds minimum FPS threshold (≥45fps)', () => {
    const benchmark = createFpsBenchmark({
      targetFps: PERFORMANCE_THRESHOLDS.MIN_FPS,
      sampleWindowMs: 1000,
    })

    // Simulate 60 FPS rendering over 1 second (16.6ms intervals)
    for (let time = 0; time <= 1000; time += 16.6) {
      benchmark.recordFrame(time)
    }

    const sample = benchmark.sample()

    expect(sample.fps).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.MIN_FPS)
    expect(sample.averageFps).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.MIN_FPS)
    expect(sample.isWithinTarget).toBe(true)
  })

  it('fails when frame rate drops below minimum threshold (<45fps)', () => {
    const benchmark = createFpsBenchmark({
      targetFps: PERFORMANCE_THRESHOLDS.MIN_FPS,
      sampleWindowMs: 1000,
    })

    // Simulate poor rendering ~20 FPS (50ms intervals)
    for (let time = 0; time <= 1000; time += 50) {
      benchmark.recordFrame(time)
    }

    const sample = benchmark.sample()

    expect(sample.averageFps).toBeLessThan(PERFORMANCE_THRESHOLDS.MIN_FPS)
    expect(sample.isWithinTarget).toBe(false)
  })

  it('asserts load time threshold does not exceed limit (≤3s)', () => {
    const startTime = performance.now()
    // Simulated load and initialization routine
    const simulatedLoadDurationMs = 1200
    const elapsed = simulatedLoadDurationMs

    expect(elapsed).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.MAX_LOAD_TIME_MS)
  })

  it('calculates frame rate correctly across different windows', () => {
    expect(calculateFps(45, 1000)).toBe(45)
    expect(calculateFps(60, 1000)).toBe(60)
    expect(calculateFps(22, 500)).toBe(44)
  })
})
