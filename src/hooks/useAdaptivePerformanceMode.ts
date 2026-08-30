import { useRef } from 'react'
import { useFrameRateMonitor } from './useFrameRateMonitor'
import { useGraphicsStore } from '@/store/graphicsStore'

const LOW_FPS_THRESHOLD = 30
const CONSECUTIVE_LOW_SAMPLES_TO_TRIGGER = 3

/**
 * Watches real-world frame rate and automatically switches the scene into
 * performance mode (fewer particles, no LOD, simpler shading) when the
 * device sustains low FPS for a few seconds - mainly a safety net for
 * lower-end mobile hardware that device-type heuristics alone miss.
 *
 * Only ever turns performance mode ON automatically; turning it back off is
 * left to the user via the settings panel, since scaling back up mid-scene
 * would otherwise cause visible thrashing.
 */
export function useAdaptivePerformanceMode() {
  const performanceMode = useGraphicsStore((state) => state.performanceMode)
  const setPerformanceMode = useGraphicsStore((state) => state.setPerformanceMode)
  const lowFpsStreakRef = useRef(0)

  useFrameRateMonitor({
    enabled: !performanceMode,
    targetFps: LOW_FPS_THRESHOLD,
    sampleWindowMs: 1000,
    onSample: (sample) => {
      if (sample.averageFps > 0 && sample.averageFps < LOW_FPS_THRESHOLD) {
        lowFpsStreakRef.current += 1
      } else {
        lowFpsStreakRef.current = 0
      }

      if (lowFpsStreakRef.current >= CONSECUTIVE_LOW_SAMPLES_TO_TRIGGER) {
        setPerformanceMode(true)
      }
    },
  })
}
