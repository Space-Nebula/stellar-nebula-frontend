import { Suspense, memo, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import { NebulaScene } from './NebulaScene'
import { CameraControls } from './CameraControls'
import { FpsCounter } from './FpsCounter'
import { RenderStatsCollector } from './RenderStatsCollector'
import { BloomEffect } from '../Effects'
import { DepthOfFieldEffect } from '../Effects/DepthOfFieldEffect'
import { WebGlFallback } from './WebGlFallback'
import { useGraphicsStore } from '@/store'
import { useAdaptivePerformanceMode } from '@/hooks/useAdaptivePerformanceMode'
import { useScanCooldown } from '@/hooks/useScanCooldown'
import { usePageVisibility } from '@/hooks/useAnimationFrame'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { MotionToggle } from '../MotionToggle'
import { trackEvent } from '@/services/analytics'
import { haptics } from '@/utils/haptics'
import { rollScanReward, rollResourceAmount } from '@/utils/rarity'
import { createRNG } from '@/utils/procedural/nebula'
import { SCAN_COOLDOWN_MS, SCAN_CHANNEL_DURATION_SEC } from '@/constants/game'
import type { ResourceType, RarityTier } from '@/types/game'
import { SCAN_POINTS_META } from './scanPoints'
import { ScanPointControls } from './ScanPointControls'
import { CanvasLiveRegion, CanvasSkipLink } from './CanvasStatusLayer'
import { useScanPointKeyboardNav } from './useScanPointKeyboardNav'

import { cleanScene } from '@/utils/three-cleanup'
import { getQualityPreset } from '@/utils/three-performance'
import { useSettingsStore } from '@/store/settingsStore'

function CanvasResourceCleanup() {
  const { gl, scene } = useThree()
  useEffect(() => {
    return () => {
      cleanScene(scene, gl)
    }
  }, [gl, scene])
  return null
}

export interface NebulaCanvasProps {
  showFps?: boolean
  showMotionControls?: boolean
  reducedMotion?: boolean
  onScanComplete?: (resourceType: ResourceType, amount: number, pointId: string) => void
}

function createInitialRng() {
  return createRNG(Date.now())
}

function NebulaCanvas({
  showFps = false,
  showMotionControls = true,
  reducedMotion: reducedMotionProp,
  onScanComplete,
}: NebulaCanvasProps) {
  const bloomEnabled = useGraphicsStore((state) => state.bloomEnabled)
  const bloomIntensity = useGraphicsStore((state) => state.bloomIntensity)
  const performanceMode = useGraphicsStore((state) => state.performanceMode)
  const starfieldDensity = useGraphicsStore((state) => state.starfieldDensity)
  useAdaptivePerformanceMode()
  const isPageVisible = usePageVisibility()
  const { prefersReducedMotion, isPaused, togglePause } = useReducedMotion()

  const isMotionReduced = reducedMotionProp ?? (prefersReducedMotion || isPaused)
  const effectivePerformanceMode = performanceMode || isMotionReduced

  const deviceHints = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
      }
    }

    const nav = navigator as Navigator & {
      userAgentData?: {
        mobile?: boolean
      }
    }

    return {
      isMobile:
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(max-width: 768px)').matches ||
        nav.userAgentData?.mobile === true,
    }
  }, [])

  const graphicsQuality = useSettingsStore((state) => state.graphicsQuality)
  const fpsMonitoringEnabled = useSettingsStore((state) => state.fpsMonitoringEnabled)
  const lowPowerMode = useSettingsStore((state) => state.lowPowerMode)

  const qualityPreset = useMemo(() => {
    return getQualityPreset(graphicsQuality, deviceHints.isMobile)
  }, [graphicsQuality, deviceHints.isMobile])

  const shouldShowFps = showFps || fpsMonitoringEnabled

  const [focusedPointId, setFocusedPointId] = useState<string | null>(null)
  const [isWrapperFocused, setIsWrapperFocused] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const [scanningPoints, setScanningPoints] = useState<Set<string>>(new Set())
  const [rarityMap, setRarityMap] = useState<Record<string, RarityTier>>({})
  const { getRemainingSeconds, startCooldown, canScan } = useScanCooldown()
  const scanRngRef = useRef(createInitialRng())
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Memoize remainingSecondsMap to avoid creating a new object on every render.
  // The object is rebuilt only when scanCooldowns change (tracked via the hook).
  const remainingSecondsMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {}
    for (const point of SCAN_POINTS_META) {
      map[point.id] = getRemainingSeconds(point.id)
    }
    return map
    // getRemainingSeconds is stable when scanCooldowns haven't changed
  }, [getRemainingSeconds])

  const handleScan = useCallback(
    (pointId: string, resourceType: ResourceType, amount: number) => {
      if (!canScan(pointId)) {
        setLiveMessage(
          `Scan point ${pointId} is on cooldown. ${getRemainingSeconds(pointId)} seconds remaining.`
        )
        haptics.warning()
        return
      }

      setScanningPoints((prev) => new Set([...prev, pointId]))
      setLiveMessage(`Scanning ${pointId} for ${resourceType}...`)
      haptics.scanStarted()
      trackEvent('scan_started', { pointId, resourceType, amount })

      setTimeout(() => {
        setScanningPoints((prev) => {
          const next = new Set(prev)
          next.delete(pointId)
          return next
        })

        const reward = rollScanReward(resourceType, scanRngRef.current)
        const finalAmount = rollResourceAmount(amount, reward.rarity)

        setRarityMap((prev) => ({ ...prev, [pointId]: reward.rarity }))
        startCooldown(pointId, SCAN_COOLDOWN_MS)

        if (onScanComplete) {
          onScanComplete(resourceType, finalAmount, pointId)
        }

        haptics.scanSuccess()
        setLiveMessage(
          `Scan complete: Harvested ${finalAmount} ${resourceType} (${reward.rarity}) from ${pointId}`
        )

        trackEvent('scan_completed', {
          pointId,
          resourceType,
          amount: finalAmount,
          rarity: reward.rarity,
        })
      }, SCAN_CHANNEL_DURATION_SEC * 1000)
    },
    [canScan, getRemainingSeconds, startCooldown, onScanComplete]
  )

  const handleWrapperKeyDown = useScanPointKeyboardNav({
    wrapperRef,
    focusedPointId,
    setFocusedPointId,
    onScan: handleScan,
    onTogglePause: togglePause,
  })

  // Clear live message after a delay for screen readers
  useEffect(() => {
    if (!liveMessage) return
    const timer = setTimeout(() => setLiveMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [liveMessage])

  return (
    // role="application" is the WAI-ARIA role for a widget that handles its own
    // keyboard input, which this canvas does; jsx-a11y does not count it as
    // interactive, so its keyboard handler needs this explicit exception.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Nebula exploration canvas. Use Tab to navigate scan points, Enter or Space to scan, arrow keys to rotate or navigate points, Q and E to zoom, R to reset view, P to pause or resume animations, Space to toggle auto-rotate."
      aria-describedby="nebula-canvas-instructions"
      aria-roledescription="3D nebula canvas"
      data-reduced-motion={isMotionReduced ? 'true' : 'false'}
      data-animations-paused={isMotionReduced ? 'true' : 'false'}
      className={`nebula-canvas-wrapper ${isWrapperFocused ? 'is-focused' : ''}`}
      onFocus={() => setIsWrapperFocused(true)}
      onBlur={(e) => {
        // Only clear if focus leaves wrapper entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsWrapperFocused(false)
        }
      }}
      onKeyDown={handleWrapperKeyDown}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        outline: isWrapperFocused ? '3px solid #32d6a5' : 'none',
        outlineOffset: '2px',
        borderRadius: '12px',
      }}
    >
      <p id="nebula-canvas-instructions" className="sr-only">
        Interactive 3D nebula with 4 scannable anomaly points. Press Tab to move between scan
        points. Press Enter or Space to scan the focused anomaly. Press P or use the Pause Motion
        button to pause or resume animations. Use arrow keys, W A S D to orbit the camera, Q to zoom
        in and E to zoom out, R to reset view, and number keys 1 2 3 for preset zoom levels. Each
        scan has a cooldown period.
      </p>

      {shouldShowFps && <FpsCounter />}
      {showMotionControls && (
        <div
          className="nebula-motion-controls"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <MotionToggle />
        </div>
      )}
      <Canvas
        frameloop={!isPageVisible || isMotionReduced ? 'never' : 'always'}
        camera={{ position: [0, 0, 5], fov: 60, near: 0.1, far: 1000 }}
        gl={{
          antialias: qualityPreset.antialias && !lowPowerMode,
          powerPreference: qualityPreset.powerPreference,
          precision: qualityPreset.precision,
        }}
        dpr={[1, lowPowerMode ? 1.0 : qualityPreset.maxPixelRatio]}
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <NebulaScene
            starfieldDensity={starfieldDensity}
            performanceMode={effectivePerformanceMode}
            onScanComplete={onScanComplete}
            onScan={handleScan}
            scanningPoints={scanningPoints}
            rarityMap={rarityMap}
            remainingSecondsMap={remainingSecondsMap}
            focusedPointId={focusedPointId}
          />
          <BloomEffect
            enabled={
              bloomEnabled && qualityPreset.bloomEnabled && !isMotionReduced && !lowPowerMode
            }
            intensity={bloomIntensity}
            performanceMode={effectivePerformanceMode}
          />
          <DepthOfFieldEffect
            enabled={qualityPreset.dofEnabled && !effectivePerformanceMode && !lowPowerMode}
            performanceMode={effectivePerformanceMode}
          />
          <CameraControls
            isMobile={deviceHints.isMobile}
            performanceMode={effectivePerformanceMode}
            reducedMotion={isMotionReduced}
          />
          <CanvasResourceCleanup />
          {shouldShowFps && <RenderStatsCollector />}
          <Preload all />
        </Suspense>
      </Canvas>

      <WebGlFallback
        alternatives={[
          'Use a browser with WebGL support',
          'Update your graphics drivers',
          'Try a different device',
        ]}
        onRetry={() => window.location.reload()}
      />

      {/* Keyboard-accessible scan controls overlay - visible for keyboard navigation */}
      <ScanPointControls
        points={SCAN_POINTS_META}
        remainingSecondsMap={remainingSecondsMap}
        scanningPoints={scanningPoints}
        focusedPointId={focusedPointId}
        isMotionReduced={isMotionReduced}
        onFocusPoint={(pointId) => setFocusedPointId(pointId)}
        onClearFocus={() => setFocusedPointId(null)}
        onScan={(point) => handleScan(point.id, point.resourceType, point.resourceAmount)}
      />

      {/* Skip link for keyboard users to bypass canvas */}
      <CanvasSkipLink />

      {/* Live region for screen readers */}
      <CanvasLiveRegion message={liveMessage} />
    </div>
  )
}

// Wrap in React.memo to prevent unnecessary re-renders when parent components
// re-render but the canvas props haven't changed.
const MemoizedNebulaCanvas = memo(NebulaCanvas)

export { MemoizedNebulaCanvas as NebulaCanvas }
