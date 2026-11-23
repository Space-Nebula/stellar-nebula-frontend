import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { useDevicePerformance, type QualitySetting } from '@/hooks/useDevicePerformance'
import { PerformanceMonitor } from '@/utils/performance-monitor'
import { NebulaParticles } from './NebulaParticles'

export interface NebulaViewProps {
  onQualityChange?: (quality: QualitySetting) => void
  initialQuality?: QualitySetting
  showFpsOverlay?: boolean
}

export const NebulaView: React.FC<NebulaViewProps> = ({
  onQualityChange,
  initialQuality,
  showFpsOverlay = true,
}) => {
  const {
    tier,
    quality,
    setQuality,
    isMobile,
    particleBudget,
    isAutoAdjusted,
    setIsAutoAdjusted,
  } = useDevicePerformance()

  const [fps, setFps] = useState<number>(60)
  const [qualityOverride, setQualityOverride] = useState<QualitySetting>(initialQuality || quality)

  // Initialize performance monitor with auto-adjust threshold < 30 FPS
  const monitor = useMemo(() => {
    return new PerformanceMonitor({
      minFpsThreshold: 30,
      sampleWindowMs: 3000,
      onQualityReduce: (newQ, dropFps) => {
        setQualityOverride(newQ)
        setQuality(newQ)
        setIsAutoAdjusted(true)
        console.warn(`[PerformanceMonitor] FPS dropped to ${dropFps}; automatically adjusted quality to ${newQ}`)
      },
    })
  }, [setQuality, setIsAutoAdjusted])

  // Sync internal quality state with hook quality changes
  useEffect(() => {
    if (!initialQuality) {
      setQualityOverride(quality)
    }
  }, [quality, initialQuality])

  // Manual override handler
  const handleQualityChange = useCallback(
    (newQuality: QualitySetting) => {
      setQualityOverride(newQuality)
      setQuality(newQuality)
      monitor.reset()
      onQualityChange?.(newQuality)
    },
    [setQuality, monitor, onQualityChange]
  )

  return (
    <div className="nebula-view-container relative w-full h-[600px] min-h-[400px] rounded-xl overflow-hidden bg-space-950 border border-space-800">
      {/* 3D Canvas with batched InstancedMesh particles */}
      <Canvas
        camera={{ position: [0, 20, 50], fov: 60 }}
        dpr={qualityOverride === 'low' ? 1.0 : [1, 1.5]}
        gl={{ antialias: qualityOverride !== 'low', powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // Track render loop to monitor FPS
          const originalRender = gl.render.bind(gl)
          gl.render = (scene, camera) => {
            monitor.recordFrame()
            setFps(monitor.getAverageFps())
            monitor.checkAutoAdjust(qualityOverride)
            originalRender(scene, camera)
          }
        }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 0, 0]} intensity={1.5} color="#e879f9" />
        <NebulaParticles
          quality={qualityOverride}
          simplifiedShaders={qualityOverride === 'low' || isMobile}
        />
      </Canvas>

      {/* Floating Quality Settings & Performance Controls */}
      <div
        className="absolute top-4 right-4 z-20 flex flex-col gap-2 p-3 rounded-lg bg-space-900/90 backdrop-blur-md border border-space-700 text-white shadow-lg text-xs"
        data-testid="performance-overlay"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-gray-300">Graphics Quality</span>
          <span className="text-[10px] text-cosmic-cyan uppercase font-bold">
            {tier} Tier {isMobile ? '(Mobile)' : '(Desktop)'}
          </span>
        </div>

        {/* User Quality Toggle Buttons */}
        <div className="flex gap-1 bg-space-950 p-1 rounded border border-space-800" role="group" aria-label="Quality settings">
          {(['low', 'medium', 'high'] as QualitySetting[]).map((q) => {
            const isSelected = qualityOverride === q
            return (
              <button
                key={q}
                type="button"
                onClick={() => handleQualityChange(q)}
                aria-pressed={isSelected}
                data-testid={`quality-btn-${q}`}
                className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                  isSelected
                    ? 'bg-cosmic-violet text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-space-800'
                }`}
              >
                {q}
              </button>
            )
          })}
        </div>

        {/* Diagnostics & FPS Monitor */}
        {showFpsOverlay && (
          <div className="pt-2 border-t border-space-800 flex justify-between items-center text-gray-400">
            <span>FPS: <strong className={fps < 30 ? 'text-rose-400' : 'text-emerald-400'}>{fps}</strong></span>
            <span>Particles: <strong className="text-gray-200">{particleBudget.toLocaleString()}</strong></span>
          </div>
        )}

        {isAutoAdjusted && (
          <div className="text-[11px] text-amber-300 bg-amber-950/60 px-2 py-1 rounded border border-amber-800/80">
            Auto-reduced to preserve ≥30 FPS
          </div>
        )}
      </div>
    </div>
  )
}

export default NebulaView
