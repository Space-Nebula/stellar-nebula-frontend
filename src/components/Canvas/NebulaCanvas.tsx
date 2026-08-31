import { Suspense, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import { NebulaScene } from './NebulaScene'
import { CameraControls } from './CameraControls'
import { FpsCounter } from './FpsCounter'
import { BloomEffect } from '../Effects'
import { useGraphicsStore } from '@/store'
import { useAdaptivePerformanceMode } from '@/hooks/useAdaptivePerformanceMode'
import { useScanCooldown } from '@/hooks/useScanCooldown'
import { trackEvent } from '@/services/analytics'
import { haptics } from '@/utils/haptics'
import { rollScanReward, rollResourceAmount } from '@/utils/rarity'
import { createRNG } from '@/utils/procedural/nebula'
import { SCAN_COOLDOWN_MS, SCAN_CHANNEL_DURATION_SEC } from '@/constants/game'
import type { ResourceType, RarityTier } from '@/types/game'

interface NebulaCanvasProps {
  showFps?: boolean
  onScanComplete?: (resourceType: ResourceType, amount: number, pointId: string) => void
}

const SCAN_POINTS_META: Array<{
  id: string
  position: [number, number, number]
  resourceType: ResourceType
  resourceAmount: number
  label: string
}> = [
  {
    id: 'scan-1',
    position: [2.2, 0.2, 0.4],
    resourceType: 'nebulite',
    resourceAmount: 50,
    label: 'Nebulite Deposit',
  },
  {
    id: 'scan-2',
    position: [-1.9, 0.8, -0.2],
    resourceType: 'stellarium',
    resourceAmount: 30,
    label: 'Stellarium Cluster',
  },
  {
    id: 'scan-3',
    position: [0.9, -1.8, 0.6],
    resourceType: 'voidcrystal',
    resourceAmount: 40,
    label: 'Voidcrystal Formation',
  },
  {
    id: 'scan-4',
    position: [-0.7, 1.7, -0.5],
    resourceType: 'darkMatter',
    resourceAmount: 25,
    label: 'Dark Matter Anomaly',
  },
]

function createInitialRng() {
  return createRNG(Date.now())
}

export function NebulaCanvas({ showFps = false, onScanComplete }: NebulaCanvasProps) {
  const bloomEnabled = useGraphicsStore((state) => state.bloomEnabled)
  const bloomIntensity = useGraphicsStore((state) => state.bloomIntensity)
  const performanceMode = useGraphicsStore((state) => state.performanceMode)
  const starfieldDensity = useGraphicsStore((state) => state.starfieldDensity)
  useAdaptivePerformanceMode()

  const [focusedPointId, setFocusedPointId] = useState<string | null>(null)
  const [isWrapperFocused, setIsWrapperFocused] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const [scanningPoints, setScanningPoints] = useState<Set<string>>(new Set())
  const [rarityMap, setRarityMap] = useState<Record<string, RarityTier>>({})
  const { getRemainingSeconds, startCooldown, canScan } = useScanCooldown()
  const scanRngRef = useRef(createInitialRng())
  const wrapperRef = useRef<HTMLDivElement>(null)

  const remainingSecondsMap: Record<string, number> = {}
  for (const point of SCAN_POINTS_META) {
    remainingSecondsMap[point.id] = getRemainingSeconds(point.id)
  }

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

  const handleScan = useCallback(
    (pointId: string, resourceType: ResourceType, amount: number) => {
      if (!canScan(pointId)) {
        setLiveMessage(
          `Scan point ${pointId} is on cooldown. ${remainingSecondsMap[pointId]} seconds remaining.`
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
    [canScan, remainingSecondsMap, startCooldown, onScanComplete]
  )

  const handleWrapperKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Handle Enter / Space to scan focused point
      if ((event.key === 'Enter' || event.key === ' ') && focusedPointId) {
        event.preventDefault()
        const point = SCAN_POINTS_META.find((p) => p.id === focusedPointId)
        if (point) {
          handleScan(point.id, point.resourceType, point.resourceAmount)
        }
        return
      }

      // Arrow keys for focus navigation between scan points when a point is focused
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        // If focus is on wrapper itself (not on a button), cycle to next point
        const active = document.activeElement
        const isButtonFocused = SCAN_POINTS_META.some(
          (p) => active?.getAttribute('data-scan-id') === p.id
        )
        if (!isButtonFocused && wrapperRef.current?.contains(active)) {
          // Only intercept if wrapper contains focus but not button -> let CameraControls handle orbit
          return
        }
        if (isButtonFocused) {
          event.preventDefault()
          const currentIdx = SCAN_POINTS_META.findIndex((p) => p.id === focusedPointId)
          const nextIdx = (currentIdx + 1) % SCAN_POINTS_META.length
          const nextId = SCAN_POINTS_META[nextIdx].id
          setFocusedPointId(nextId)
          const nextBtn = wrapperRef.current?.querySelector<HTMLButtonElement>(
            `[data-scan-id="${nextId}"]`
          )
          nextBtn?.focus()
        }
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        const active = document.activeElement
        const isButtonFocused = SCAN_POINTS_META.some(
          (p) => active?.getAttribute('data-scan-id') === p.id
        )
        if (isButtonFocused) {
          event.preventDefault()
          const currentIdx = SCAN_POINTS_META.findIndex((p) => p.id === focusedPointId)
          const prevIdx = (currentIdx - 1 + SCAN_POINTS_META.length) % SCAN_POINTS_META.length
          const prevId = SCAN_POINTS_META[prevIdx].id
          setFocusedPointId(prevId)
          const prevBtn = wrapperRef.current?.querySelector<HTMLButtonElement>(
            `[data-scan-id="${prevId}"]`
          )
          prevBtn?.focus()
        }
      }

      // Home / End to jump to first/last
      if (event.key === 'Home' && focusedPointId) {
        event.preventDefault()
        const firstId = SCAN_POINTS_META[0].id
        setFocusedPointId(firstId)
        wrapperRef.current?.querySelector<HTMLButtonElement>(`[data-scan-id="${firstId}"]`)?.focus()
      }
      if (event.key === 'End' && focusedPointId) {
        event.preventDefault()
        const lastId = SCAN_POINTS_META[SCAN_POINTS_META.length - 1].id
        setFocusedPointId(lastId)
        wrapperRef.current?.querySelector<HTMLButtonElement>(`[data-scan-id="${lastId}"]`)?.focus()
      }
    },
    [focusedPointId, handleScan]
  )

  // Clear live message after a delay for screen readers
  useEffect(() => {
    if (!liveMessage) return
    const timer = setTimeout(() => setLiveMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [liveMessage])

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="application"
      aria-label="Nebula exploration canvas. Use Tab to navigate scan points, Enter or Space to scan, arrow keys to rotate or navigate points, Q and E to zoom, R to reset view, Space to toggle auto-rotate."
      aria-describedby="nebula-canvas-instructions"
      aria-roledescription="3D nebula canvas"
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
        points. Press Enter or Space to scan the focused anomaly. Use arrow keys, W A S D to orbit
        the camera, Q to zoom in and E to zoom out, R to reset view, and number keys 1 2 3 for
        preset zoom levels. Each scan has a cooldown period.
      </p>

      {showFps && <FpsCounter />}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: !deviceHints.isMobile, powerPreference: 'high-performance' }}
        dpr={[1, deviceHints.isMobile ? 1.5 : 2]}
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <NebulaScene
            starfieldDensity={starfieldDensity}
            performanceMode={performanceMode}
            onScanComplete={onScanComplete}
            onScan={handleScan}
            scanningPoints={scanningPoints}
            rarityMap={rarityMap}
            remainingSecondsMap={remainingSecondsMap}
            focusedPointId={focusedPointId}
          />
          <BloomEffect
            enabled={bloomEnabled}
            intensity={bloomIntensity}
            performanceMode={performanceMode}
          />
          <CameraControls isMobile={deviceHints.isMobile} performanceMode={performanceMode} />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Keyboard-accessible scan controls overlay - visible for keyboard navigation */}
      <div
        className="nebula-keyboard-controls"
        role="group"
        aria-label="Scan points - press Tab to navigate, Enter to scan"
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          zIndex: 5,
          pointerEvents: 'auto',
        }}
      >
        {SCAN_POINTS_META.map((point) => {
          const remaining = remainingSecondsMap[point.id] || 0
          const isOnCooldown = remaining > 0
          const isScanning = scanningPoints.has(point.id)
          const isFocused = focusedPointId === point.id
          const isDisabled = isOnCooldown || isScanning

          return (
            <button
              key={point.id}
              type="button"
              data-scan-id={point.id}
              tabIndex={0}
              aria-label={
                isScanning
                  ? `Scanning ${point.label}... please wait`
                  : isOnCooldown
                    ? `${point.label} on cooldown, ${remaining} seconds remaining`
                    : `Scan ${point.label} for ${point.resourceAmount} ${point.resourceType}. Press Enter to scan.`
              }
              aria-pressed={isScanning}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onFocus={() => setFocusedPointId(point.id)}
              onBlur={() => {
                // Delay to allow focus to move to next button
                setTimeout(() => {
                  const active = document.activeElement?.getAttribute('data-scan-id')
                  if (!active) setFocusedPointId(null)
                }, 0)
              }}
              onClick={() => handleScan(point.id, point.resourceType, point.resourceAmount)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleScan(point.id, point.resourceType, point.resourceAmount)
                }
              }}
              className={`nebula-scan-button ${isFocused ? 'is-focused' : ''} ${isDisabled ? 'is-disabled' : ''}`}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '999px',
                border: isFocused ? '3px solid #32d6a5' : '2px solid rgba(159, 216, 255, 0.3)',
                background: isScanning
                  ? 'rgba(34, 197, 94, 0.25)'
                  : isOnCooldown
                    ? 'rgba(75, 85, 99, 0.6)'
                    : isFocused
                      ? 'rgba(50, 214, 165, 0.25)'
                      : 'rgba(10, 16, 32, 0.85)',
                color: isOnCooldown ? '#9ca3af' : '#f8fbff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                outline: 'none',
                boxShadow: isFocused
                  ? '0 0 0 3px rgba(50, 214, 165, 0.4), 0 4px 12px rgba(0,0,0,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.2)',
                transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 160ms ease',
                minHeight: '2.5rem',
                minWidth: '2.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                opacity: isOnCooldown ? 0.7 : 1,
              }}
            >
              <span aria-hidden="true">{isScanning ? '◉' : isOnCooldown ? '◐' : '◎'}</span>
              <span>{point.id}</span>
              {isOnCooldown && <span aria-hidden="true">({remaining}s)</span>}
              {isScanning && <span aria-hidden="true">...</span>}
            </button>
          )
        })}
      </div>

      {/* Skip link for keyboard users to bypass canvas */}
      <a
        href="#nebula-scan-results"
        className="sr-only focus:not-sr-only"
        style={{
          position: 'absolute',
          top: '0.5rem',
          left: '0.5rem',
          zIndex: 10,
          padding: '0.5rem 0.75rem',
          background: '#32d6a5',
          color: '#07111f',
          borderRadius: '6px',
          fontWeight: 700,
          textDecoration: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.position = 'absolute'
          e.currentTarget.style.clip = 'auto'
          e.currentTarget.style.width = 'auto'
          e.currentTarget.style.height = 'auto'
        }}
        onBlur={(e) => {
          e.currentTarget.style.position = 'absolute'
          e.currentTarget.style.clip = 'rect(0, 0, 0, 0)'
          e.currentTarget.style.width = '1px'
          e.currentTarget.style.height = '1px'
        }}
      >
        Skip nebula canvas
      </a>

      {/* Live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {liveMessage}
      </div>
    </div>
  )
}
