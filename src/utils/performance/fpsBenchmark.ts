export interface FpsBenchmarkOptions {
  targetFps?: number
  sampleWindowMs?: number
}

export interface FpsBenchmarkSample {
  fps: number
  averageFps: number
  sampleCount: number
  isWithinTarget: boolean
}

const DEFAULT_SAMPLE_WINDOW_MS = 1000

export function calculateFps(frameCount: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  return Math.round((frameCount * 1000) / elapsedMs)
}

export function createFpsBenchmark(options: FpsBenchmarkOptions = {}) {
  const targetFps = options.targetFps ?? 60
  const sampleWindowMs = options.sampleWindowMs ?? DEFAULT_SAMPLE_WINDOW_MS
  const frameTimestamps: number[] = []
  const samples: number[] = []

  return {
    recordFrame(timestamp = performance.now()) {
      frameTimestamps.push(timestamp)
      return timestamp
    },

    sample(): FpsBenchmarkSample {
      if (frameTimestamps.length < 2) {
        const fps = frameTimestamps.length === 0 ? 0 : 1
        samples.push(fps)
        const averageFps = Math.round(
          samples.reduce((total, value) => total + value, 0) / samples.length
        )

        return {
          fps,
          averageFps,
          sampleCount: samples.length,
          isWithinTarget: fps >= targetFps,
        }
      }

      const elapsed = Math.max(frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[0], 1)
      const fps = calculateFps(Math.max(frameTimestamps.length - 1, 0), elapsed)
      samples.push(Math.min(fps, sampleWindowMs))

      const averageFps = Math.round(
        samples.reduce((total, value) => total + value, 0) / samples.length
      )
      const result = {
        fps,
        averageFps,
        sampleCount: samples.length,
        isWithinTarget: fps >= targetFps,
      }

      frameTimestamps.length = 0
      return result
    },
  }
}
