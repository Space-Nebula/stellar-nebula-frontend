import { useEffect, useRef, useState, useCallback } from 'react'
import { NebulaCanvas, type NebulaCanvasProps } from './Canvas/NebulaCanvas'
import { cleanScene } from '@/utils/three-cleanup'
import { useNebulaScene } from '@/hooks/useNebulaScene'
import type { ResourceType } from '@/types/game'

export interface NebulaViewProps extends NebulaCanvasProps {
  initialSectorSeed?: string
  onSectorChange?: (seed: string) => void
  onCleanup?: () => void
}

/**
 * NebulaView component with comprehensive lifecycle & memory leak disposal (#544).
 * Ensures Three.js scenes, geometries, materials, shaders, and event listeners
 * are fully disposed when changing sectors or unmounting.
 */
export function NebulaView({
  initialSectorSeed,
  onSectorChange,
  onCleanup,
  onScanComplete,
  ...canvasProps
}: NebulaViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeSector, setActiveSector] = useState(initialSectorSeed ?? 'sector-alpha-01')

  const {
    scene,
    changeNebula,
    recordScan,
    clearTrackedResources,
  } = useNebulaScene({
    initialSeed: activeSector,
    onSceneChange: onSectorChange,
  })

  // Handle sector transitions safely disposing previous sector's assets
  const handleSectorSwitch = useCallback(
    (newSeed: string) => {
      setActiveSector(newSeed)
      changeNebula(newSeed)
    },
    [changeNebula]
  )

  const handleScan = useCallback(
    (resourceType: ResourceType, amount: number, pointId: string) => {
      recordScan()
      onScanComplete?.(resourceType, amount, pointId)
    },
    [recordScan, onScanComplete]
  )

  // Comprehensive unmount cleanup
  useEffect(() => {
    return () => {
      clearTrackedResources()
      if (scene) {
        cleanScene(scene)
      }
      onCleanup?.()
    }
  }, [scene, clearTrackedResources, onCleanup])

  return (
    <div
      ref={containerRef}
      className="nebula-view-container relative w-full h-full min-h-[400px] overflow-hidden"
      data-sector-seed={activeSector}
    >
      <NebulaCanvas
        {...canvasProps}
        onScanComplete={handleScan}
      />
    </div>
  )
}

export default NebulaView
