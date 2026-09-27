import { useCallback, useEffect, useState } from 'react'
import { useFrameRateMonitor } from '@/hooks/useFrameRateMonitor'
import { useRenderStatsStore } from '@/store/renderStatsStore'
import { trackEvent } from '@/services/analytics'

/** Chrome-only, non-standard `performance.memory`; absent elsewhere. */
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

const toMB = (bytes: number) => Math.round((bytes / 1_048_576) * 10) / 10

/**
 * Snapshot of every metric this component displays, used both for the
 * on-screen overlay and for the "export metrics" download (issue #322).
 */
export interface FpsCounterMetrics {
  fps: number
  averageFps: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  memoryUsedMB: number | null
  memoryLimitMB: number | null
  capturedAt: string
}

function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function FpsCounter() {
  const [memUsed, setMemUsed] = useState<number | null>(null)
  const [memLimit, setMemLimit] = useState<number | null>(null)
  const [history, setHistory] = useState<FpsCounterMetrics[]>([])

  const drawCalls = useRenderStatsStore((s) => s.drawCalls)
  const triangles = useRenderStatsStore((s) => s.triangles)
  const geometries = useRenderStatsStore((s) => s.geometries)
  const textures = useRenderStatsStore((s) => s.textures)

  const { fps, averageFps } = useFrameRateMonitor({
    enabled: true,
    targetFps: 60,
    sampleWindowMs: 1000,
    onSample: (sample) => {
      // Integration with the monitoring service (issue #322's suggested
      // approach), the same event shape the Debug performance monitor sends.
      trackEvent('performance_metric', {
        metric: 'fps',
        value: sample.fps,
        drawCalls,
        triangles,
      })
    },
  })

  // performance.memory is Chrome-only and non-standard; sampled on the same
  // 1s cadence the FPS monitor uses rather than every frame.
  useEffect(() => {
    const interval = setInterval(() => {
      const mem = (performance as PerformanceWithMemory).memory
      if (mem) {
        setMemUsed(mem.usedJSHeapSize)
        setMemLimit(mem.jsHeapSizeLimit)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setHistory((prev) =>
      [
        ...prev,
        {
          fps,
          averageFps,
          drawCalls,
          triangles,
          geometries,
          textures,
          memoryUsedMB: memUsed !== null ? toMB(memUsed) : null,
          memoryLimitMB: memLimit !== null ? toMB(memLimit) : null,
          capturedAt: new Date().toISOString(),
        },
      ].slice(-120) // ~2 minutes of samples at the 1s sampling cadence above.
    )
  }, [fps, averageFps, drawCalls, triangles, geometries, textures, memUsed, memLimit])

  const exportMetrics = useCallback(() => {
    trackEvent('performance_metrics_exported', { sampleCount: history.length })
    downloadJSON(`nebula-perf-${Date.now()}.json`, {
      current: history[history.length - 1] ?? null,
      history,
    })
  }, [history])

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        padding: '6px 8px',
        background: 'rgba(0,0,0,0.6)',
        color: '#e5e7eb',
        fontFamily: 'monospace',
        fontSize: 11,
        borderRadius: 4,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 120,
      }}
    >
      <div style={{ color: fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171' }}>
        {fps} FPS <span style={{ opacity: 0.6 }}>(avg {averageFps})</span>
      </div>
      <div>Draws: {drawCalls}</div>
      <div>Tris: {triangles.toLocaleString()}</div>
      <div>
        Geo/Tex: {geometries}/{textures}
      </div>
      {memUsed !== null && memLimit !== null && (
        <div>
          Mem: {toMB(memUsed)}/{toMB(memLimit)} MB
        </div>
      )}
      <button
        type="button"
        onClick={exportMetrics}
        style={{
          marginTop: 2,
          padding: '2px 4px',
          fontSize: 10,
          fontFamily: 'inherit',
          background: 'rgba(255,255,255,0.08)',
          color: 'inherit',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 3,
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        Export
      </button>
    </div>
  )
}
