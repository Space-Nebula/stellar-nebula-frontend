/**
 * Performance monitoring utility with automatic graphics quality throttling.
 *
 * Tracks rendering frame rates and automatically reduces quality preset if sustained
 * FPS drops below 30 FPS on mid-range or constrained mobile devices.
 */

import type { QualitySetting } from '@/hooks/useDevicePerformance'
import { useEffect, useRef } from 'react'

/** Log committed renders in development so regressions are visible during profiling. */
export function useRenderCount(componentName: string): void {
  const count = useRef(0)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    count.current += 1
    console.warn(`[render] ${componentName}: ${count.current}`)
  })
}

export interface PerformanceMonitorConfig {
  minFpsThreshold?: number // Default 30 FPS
  sampleWindowMs?: number // Window duration for moving average (default 3000ms)
  consecutiveDropCountLimit?: number // Consecutive windows below threshold before downgrading
  onQualityReduce?: (newQuality: QualitySetting, fps: number) => void
}

export class PerformanceMonitor {
  private minFpsThreshold: number
  private sampleWindowMs: number
  private consecutiveDropCountLimit: number
  private onQualityReduce?: (newQuality: QualitySetting, fps: number) => void

  private frameTimestamps: number[] = []
  private windowStartTime: number = 0
  private consecutiveDrops: number = 0
  private currentFps: number = 60
  private averageFps: number = 60
  private isMonitoring: boolean = false

  constructor(config: PerformanceMonitorConfig = {}) {
    this.minFpsThreshold = config.minFpsThreshold ?? 30
    this.sampleWindowMs = config.sampleWindowMs ?? 3000
    this.consecutiveDropCountLimit = config.consecutiveDropCountLimit ?? 1
    this.onQualityReduce = config.onQualityReduce
    this.reset()
  }

  /**
   * Reset the frame monitoring history.
   */
  public reset(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    this.frameTimestamps = []
    this.windowStartTime = now
    this.consecutiveDrops = 0
    this.currentFps = 60
    this.averageFps = 60
  }

  /**
   * Record a single rendered frame tick.
   */
  public recordFrame(
    timestamp: number = typeof performance !== 'undefined' ? performance.now() : Date.now()
  ): void {
    if (this.frameTimestamps.length > 0) {
      const last = this.frameTimestamps[this.frameTimestamps.length - 1]
      const delta = timestamp - last
      if (delta > 0) {
        this.currentFps = Math.min(120, Math.round(1000 / delta))
      }
    }

    this.frameTimestamps.push(timestamp)

    // Keep only timestamps within sample window
    const cutoff = timestamp - this.sampleWindowMs
    while (this.frameTimestamps.length > 0 && this.frameTimestamps[0] < cutoff) {
      this.frameTimestamps.shift()
    }

    if (this.frameTimestamps.length >= 2) {
      const span = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0]
      if (span > 0) {
        this.averageFps = Math.min(
          120,
          Math.round(((this.frameTimestamps.length - 1) * 1000) / span)
        )
      }
    }
  }

  /**
   * Get the most recent instantaneous FPS.
   */
  public getCurrentFps(): number {
    return this.currentFps
  }

  /**
   * Get the average FPS across the sliding sampling window.
   */
  public getAverageFps(): number {
    return this.averageFps
  }

  /**
   * Check if FPS is below 30 and determine if an automatic quality reduction should occur.
   *
   * Transition:
   * 'high' -> 'medium'
   * 'medium' -> 'low'
   * 'low' -> 'low' (already minimum)
   */
  public checkAutoAdjust(currentQuality: QualitySetting): QualitySetting {
    // Only check if we have accumulated at least 1.5 seconds of frame samples
    if (this.frameTimestamps.length < 30) {
      return currentQuality
    }

    if (this.averageFps < this.minFpsThreshold) {
      this.consecutiveDrops += 1

      if (this.consecutiveDrops >= this.consecutiveDropCountLimit) {
        let newQuality: QualitySetting = currentQuality

        if (currentQuality === 'high') {
          newQuality = 'medium'
        } else if (currentQuality === 'medium') {
          newQuality = 'low'
        }

        if (newQuality !== currentQuality) {
          if (this.onQualityReduce) {
            this.onQualityReduce(newQuality, this.averageFps)
          }
          this.consecutiveDrops = 0
          this.frameTimestamps = []
          return newQuality
        }
      }
    } else {
      this.consecutiveDrops = 0
    }

    return currentQuality
  }
}
