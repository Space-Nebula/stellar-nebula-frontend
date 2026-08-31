/**
 * React Profiler monitoring utilities for tracking render performance.
 *
 * Issue #260: Add React Profiler monitoring
 */
/* eslint-disable react-refresh/only-export-components -- utility module: profiler helpers ship alongside the wrapper component */

import { Profiler } from 'react'
import type { ProfilerOnRenderCallback } from 'react'

export interface ProfilerData {
  id: string
  phase: 'mount' | 'update' | 'nested-update'
  actualDuration: number
  baseDuration: number
  startTime: number
  commitTime: number
}

/**
 * Performance threshold in milliseconds.
 * Renders taking longer than this will be logged as slow.
 */
const SLOW_RENDER_THRESHOLD = 16 // 16ms = 60fps target

/**
 * Store for profiler data - in production, send this to your monitoring service
 */
const profilerDataStore: ProfilerData[] = []

/**
 * Callback for React Profiler that logs slow renders.
 */
export const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  const data: ProfilerData = {
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  }

  // Store the data
  profilerDataStore.push(data)

  // Log slow renders in development
  if (import.meta.env.DEV && actualDuration > SLOW_RENDER_THRESHOLD) {
    console.warn(`[Profiler] Slow ${phase} render detected:`, {
      component: id,
      duration: `${actualDuration.toFixed(2)}ms`,
      baseline: `${baseDuration.toFixed(2)}ms`,
      threshold: `${SLOW_RENDER_THRESHOLD}ms`,
    })
  }

  // In production, send to monitoring service (Sentry, LogRocket, etc.)
  if (!import.meta.env.DEV && actualDuration > SLOW_RENDER_THRESHOLD) {
    // Example: Send to Sentry
    if (window.Sentry) {
      window.Sentry.captureMessage(`Slow render: ${id}`, {
        level: 'warning',
        extra: data,
      })
    }
  }

  // Keep only last 100 entries to prevent memory leaks
  if (profilerDataStore.length > 100) {
    profilerDataStore.shift()
  }
}

/**
 * Get profiler statistics for a specific component.
 */
export function getProfilerStats(componentId: string) {
  const componentData = profilerDataStore.filter((d) => d.id === componentId)

  if (componentData.length === 0) {
    return null
  }

  const durations = componentData.map((d) => d.actualDuration)
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length
  const max = Math.max(...durations)
  const min = Math.min(...durations)

  return {
    componentId,
    renderCount: componentData.length,
    avgDuration: avg,
    maxDuration: max,
    minDuration: min,
    mountCount: componentData.filter((d) => d.phase === 'mount').length,
    updateCount: componentData.filter((d) => d.phase === 'update').length,
  }
}

/**
 * Get all profiler data (useful for debugging or exporting).
 */
export function getAllProfilerData(): ProfilerData[] {
  return [...profilerDataStore]
}

/**
 * Clear all profiler data.
 */
export function clearProfilerData(): void {
  profilerDataStore.length = 0
}

/**
 * Wrapper component that adds profiling to any component.
 *
 * @example
 * <ProfiledComponent id="NebulaCanvas">
 *   <NebulaCanvas />
 * </ProfiledComponent>
 */
export function ProfiledComponent({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  )
}

/**
 * Hook to measure custom performance metrics.
 */
export function usePerformanceMonitoring(metricName: string) {
  const startTime = performance.now()

  return {
    end: () => {
      const duration = performance.now() - startTime

      if (duration > SLOW_RENDER_THRESHOLD) {
        console.warn(`[Performance] ${metricName} took ${duration.toFixed(2)}ms`)
      }

      return duration
    },
  }
}

// Type augmentation for window.Sentry
declare global {
  interface Window {
    Sentry?: {
      captureMessage: (message: string, context?: { level?: string; extra?: unknown }) => void
    }
  }
}
