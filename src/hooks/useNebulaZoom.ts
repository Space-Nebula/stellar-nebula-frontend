import { useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3 } from 'three'
import { useGraphicsStore } from '@/store/graphicsStore'
import type { ZoomLevel } from '@/store/graphicsStore'

export type { ZoomLevel }

export interface ZoomLevelConfig {
  label: ZoomLevel
  minDistance: number
  maxDistance: number
  targetDistance: number
  particleDensity: number
}

export const ZOOM_LEVELS: Record<ZoomLevel, ZoomLevelConfig> = {
  overview: {
    label: 'overview',
    minDistance: 15,
    maxDistance: 25,
    targetDistance: 20,
    particleDensity: 1.2,
  },
  exploration: {
    label: 'exploration',
    minDistance: 7,
    maxDistance: 15,
    targetDistance: 10,
    particleDensity: 0.85,
  },
  detail: {
    label: 'detail',
    minDistance: 2,
    maxDistance: 7,
    targetDistance: 4,
    particleDensity: 0.5,
  },
}

function distanceToZoomLevel(dist: number): ZoomLevel {
  if (dist >= ZOOM_LEVELS.overview.minDistance) return 'overview'
  if (dist >= ZOOM_LEVELS.exploration.minDistance) return 'exploration'
  return 'detail'
}

/**
 * React hook that synchronises the Three.js camera zoom level with the
 * graphics store and adjusts starfield density accordingly.
 *
 * @param controlsRef - Reference to the OrbitControls instance
 *
 * @example
 * const controlsRef = useRef<OrbitControls>(null)
 * const { currentZoomLevel, jumpToLevel } = useNebulaZoom(controlsRef)
 */
export function useNebulaZoom(controlsRef: React.RefObject<OrbitControlsImpl | null>) {
  const { camera } = useThree()
  const setStarfieldDensity = useGraphicsStore((s) => s.setStarfieldDensity)
  const currentZoomLevel = useGraphicsStore((s) => s.zoomLevel)
  const setZoomLevel = useGraphicsStore((s) => s.setZoomLevel)

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return

    const target = controls.target
    const dist = new Vector3().subVectors(camera.position, target).length()
    const level = distanceToZoomLevel(dist)

    if (level !== currentZoomLevel) {
      setZoomLevel(level)
      setStarfieldDensity(ZOOM_LEVELS[level].particleDensity)
    }
  })

  /** Programmatically jump to a specific zoom level. */
  const jumpToLevel = useCallback(
    (level: ZoomLevel) => {
      const controls = controlsRef.current
      if (!controls) return

      const target = controls.target
      const currentOffset = new Vector3().subVectors(camera.position, target)
      const direction = currentOffset.normalize()
      const targetDist = ZOOM_LEVELS[level].targetDistance

      camera.position.copy(target.clone().add(direction.multiplyScalar(targetDist)))
      controls.update()
    },
    [camera, controlsRef]
  )

  return { currentZoomLevel, jumpToLevel }
}
