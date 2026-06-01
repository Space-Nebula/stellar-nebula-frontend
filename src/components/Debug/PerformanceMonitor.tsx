import { useEffect, useState } from 'react'
import { useGraphicsStore } from '@/store'
import { trackEvent } from '@/services/analytics'
import { useFrameRateMonitor } from '@/hooks/useFrameRateMonitor'

const BASE_STAR_COUNT = 4200

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

function getParticleCount(density: number, performanceMode: boolean): number {
  const clamped = Math.min(1.5, Math.max(0.4, density))
  return Math.round(BASE_STAR_COUNT * clamped * (performanceMode ? 0.72 : 1))
}

export function PerformanceMonitor() {
  const [visible, setVisible] = useState(true)
  const [memUsed, setMemUsed] = useState<number | null>(null)
  const [memLimit, setMemLimit] = useState<number | null>(null)

  const density = useGraphicsStore((s) => s.starfieldDensity)
  const performanceMode = useGraphicsStore((s) => s.performanceMode)
  const particleCount = getParticleCount(density, performanceMode)

  const { fps } = useFrameRateMonitor({
    enabled: visible,
    targetFps: 60,
    sampleWindowMs: 1000,
    onSample: (sample) => {
      trackEvent('performance_metric', {
        metric: 'fps',
        value: sample.fps,
        performanceMode,
        particleCount,
      })
    },
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!visible) return

    const mem = (performance as PerformanceWithMemory).memory
    if (mem) {
      setMemUsed(mem.usedJSHeapSize)
      setMemLimit(mem.jsHeapSizeLimit)
    }
  }, [particleCount, performanceMode, visible])

  if (!visible) return null

  const fpsColor = fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171'
  const memPercent = memUsed && memLimit ? (memUsed / memLimit) * 100 : null
  const memColor =
    memPercent === null
      ? '#94a3b8'
      : memPercent < 60
        ? '#4ade80'
        : memPercent < 80
          ? '#facc15'
          : '#f87171'
  const toMB = (bytes: number) => (bytes / 1_048_576).toFixed(1)

  return (
    <div style={overlayStyle}>
      <div style={headerStyle}>PERF</div>
      <StatRow label="FPS" value={String(fps)} color={fpsColor} />
      <StatRow label="Particles" value={particleCount.toLocaleString()} color="#c084fc" />
      <StatRow
        label="Memory"
        value={
          memUsed !== null && memLimit !== null ? `${toMB(memUsed)} / ${toMB(memLimit)} MB` : 'N/A'
        }
        color={memColor}
      />
      <div style={hintStyle}>Ctrl+Shift+P</div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={{ ...valueStyle, color }}>{value}</span>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 8,
  left: 8,
  zIndex: 200,
  minWidth: 160,
  padding: '6px 10px',
  background: 'rgba(0, 0, 0, 0.72)',
  border: '1px solid rgba(167, 139, 250, 0.22)',
  borderRadius: 6,
  backdropFilter: 'blur(8px)',
  pointerEvents: 'none',
  userSelect: 'none',
  fontFamily: 'monospace',
}

const headerStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: 'rgba(255,255,255,0.38)',
  marginBottom: 4,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 2,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.52)',
}

const valueStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
}

const hintStyle: React.CSSProperties = {
  marginTop: 5,
  fontSize: 9,
  color: 'rgba(255,255,255,0.26)',
  textAlign: 'right',
}
