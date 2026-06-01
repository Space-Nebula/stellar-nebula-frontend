import { useEffect, useRef, useState } from 'react'
import { calculateFps, type FpsBenchmarkSample } from '@/utils/performance/fpsBenchmark'

interface UseFrameRateMonitorOptions {
  enabled?: boolean
  targetFps?: number
  sampleWindowMs?: number
  onSample?: (sample: FpsBenchmarkSample) => void
}

/**
 * Hook that monitors the browser's frame rate via requestAnimationFrame.
 *
 * @param options.enabled       - Whether monitoring is active (default true)
 * @param options.targetFps     - Target FPS for the isWithinTarget flag (default 60)
 * @param options.sampleWindowMs- Window over which to compute FPS (default 1000)
 * @param options.onSample      - Callback invoked on each completed sample
 *
 * @example
 * const { fps, averageFps, isWithinTarget } = useFrameRateMonitor()
 */
export function useFrameRateMonitor({
  enabled = true,
  targetFps = 60,
  sampleWindowMs = 1000,
  onSample,
}: UseFrameRateMonitorOptions = {}) {
  const [fps, setFps] = useState(0)
  const [averageFps, setAverageFps] = useState(0)
  const [sampleCount, setSampleCount] = useState(0)

  const lastTimestampRef = useRef<number | null>(null)
  const frameCountRef = useRef(0)
  const historyRef = useRef<number[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) return

    lastTimestampRef.current = performance.now()

    const tick = (timestamp: number) => {
      frameCountRef.current += 1

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
      }

      const elapsed = timestamp - lastTimestampRef.current

      if (elapsed >= sampleWindowMs) {
        const nextFps = calculateFps(frameCountRef.current, elapsed)
        historyRef.current = [...historyRef.current, nextFps].slice(-10)
        const nextAverageFps = Math.round(
          historyRef.current.reduce((sum, value) => sum + value, 0) / historyRef.current.length
        )

        setFps(nextFps)
        setAverageFps(nextAverageFps)
        setSampleCount((current) => current + 1)

        onSample?.({
          fps: nextFps,
          averageFps: nextAverageFps,
          sampleCount: historyRef.current.length,
          isWithinTarget: nextFps >= targetFps,
        })

        frameCountRef.current = 0
        lastTimestampRef.current = timestamp
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, onSample, sampleWindowMs, targetFps])

  return {
    fps,
    averageFps,
    sampleCount,
    isWithinTarget: fps >= targetFps,
  }
}
