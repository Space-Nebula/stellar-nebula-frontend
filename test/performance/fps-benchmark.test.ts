import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateFps, createFpsBenchmark } from '../../src/utils/performance/fpsBenchmark'

describe('FPS Performance Benchmarks & Regression Detection', () => {
  const originalNow = performance.now.bind(performance)

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    performance.now = originalNow
  })

  describe('calculateFps', () => {
    it('accurately computes FPS across standard time slices', () => {
      // 60 frames in 1000ms = 60 FPS
      expect(calculateFps(60, 1000)).toBe(60)
      // 30 frames in 500ms = 60 FPS
      expect(calculateFps(30, 500)).toBe(60)
      // 120 frames in 1000ms = 120 FPS
      expect(calculateFps(120, 1000)).toBe(120)
      // 15 frames in 500ms = 30 FPS
      expect(calculateFps(15, 500)).toBe(30)
    })

    it('handles zero or negative elapsed times gracefully', () => {
      expect(calculateFps(60, 0)).toBe(0)
      expect(calculateFps(60, -100)).toBe(0)
      expect(calculateFps(0, 1000)).toBe(0)
    })
  })

  describe('createFpsBenchmark target benchmark: 60 FPS', () => {
    it('validates standard 60 FPS target benchmark configuration', () => {
      const benchmark = createFpsBenchmark({ targetFps: 60, sampleWindowMs: 1000 })
      expect(benchmark).toBeDefined()
      expect(typeof benchmark.recordFrame).toBe('function')
      expect(typeof benchmark.sample).toBe('function')
    })

    it('verifies sustained 60 FPS rendering under smooth frame cadences (~16.6ms intervals)', () => {
      const benchmark = createFpsBenchmark({ targetFps: 60, sampleWindowMs: 1000 })

      // Simulate 61 frame stamps recorded at ~16.67ms intervals
      let currentTimestamp = 0
      for (let i = 0; i <= 60; i++) {
        benchmark.recordFrame(currentTimestamp)
        currentTimestamp += 16.666
      }

      const sample = benchmark.sample()

      expect(sample.fps).toBeGreaterThanOrEqual(58)
      expect(sample.fps).toBeLessThanOrEqual(62)
      expect(sample.averageFps).toBeGreaterThanOrEqual(58)
      expect(sample.isWithinTarget).toBe(true)
      expect(sample.sampleCount).toBe(1)
    })

    it('detects performance regression when frame rates drop below 60 FPS threshold', () => {
      const benchmark = createFpsBenchmark({ targetFps: 60, sampleWindowMs: 1000 })

      // Simulate a dropped-frame stutter (e.g. heavy GC pauses or shader compilation: 100ms per frame)
      benchmark.recordFrame(0)
      benchmark.recordFrame(100)
      benchmark.recordFrame(200)
      benchmark.recordFrame(300)
      benchmark.recordFrame(400)
      benchmark.recordFrame(500)

      const sample = benchmark.sample()

      // 5 frames over 500ms = 10 FPS
      expect(sample.fps).toBe(10)
      expect(sample.isWithinTarget).toBe(false)
    })

    it('supports custom target FPS for adaptive lower-power modes (30 FPS target)', () => {
      const benchmark = createFpsBenchmark({ targetFps: 30, sampleWindowMs: 1000 })

      // 30 FPS cadence (~33.3ms per frame)
      let currentTimestamp = 0
      for (let i = 0; i <= 30; i++) {
        benchmark.recordFrame(currentTimestamp)
        currentTimestamp += 33.333
      }

      const sample = benchmark.sample()

      expect(sample.fps).toBeGreaterThanOrEqual(29)
      expect(sample.isWithinTarget).toBe(true)
    })

    it('resets frame buffer after sampling while updating cumulative average FPS', () => {
      const benchmark = createFpsBenchmark({ targetFps: 60, sampleWindowMs: 1000 })

      // Cycle 1: 60 FPS
      benchmark.recordFrame(0)
      benchmark.recordFrame(16.6)
      benchmark.recordFrame(33.3)
      const sample1 = benchmark.sample()
      expect(sample1.sampleCount).toBe(1)

      // Cycle 2: 30 FPS
      benchmark.recordFrame(0)
      benchmark.recordFrame(33.3)
      benchmark.recordFrame(66.6)
      const sample2 = benchmark.sample()
      expect(sample2.sampleCount).toBe(2)
      expect(sample2.averageFps).toBeDefined()
    })

    it('handles edge case when insufficient frames are recorded', () => {
      const benchmark = createFpsBenchmark({ targetFps: 60 })
      const sampleZero = benchmark.sample()
      expect(sampleZero.fps).toBe(0)
      expect(sampleZero.isWithinTarget).toBe(false)

      benchmark.recordFrame(100)
      const sampleOne = benchmark.sample()
      expect(sampleOne.fps).toBe(1)
    })
  })
})
