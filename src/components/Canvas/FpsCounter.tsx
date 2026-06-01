import { useFrameRateMonitor } from '@/hooks/useFrameRateMonitor'

export function FpsCounter() {
  const { fps } = useFrameRateMonitor({
    enabled: true,
    targetFps: 60,
    sampleWindowMs: 1000,
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        padding: '2px 8px',
        background: 'rgba(0,0,0,0.6)',
        color: fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171',
        fontFamily: 'monospace',
        fontSize: 12,
        borderRadius: 4,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 100,
      }}
    >
      {fps} FPS
    </div>
  )
}
