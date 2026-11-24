import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  cleanScene,
  disposeGeometry,
  disposeMaterial,
  disposeTexture,
  disposeHierarchy,
  type DisposableResource,
} from '@/utils/three-cleanup'

export interface NebulaSceneState {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  activeNebulaSeed: string | null
  scanCount: number
}

export interface UseNebulaSceneOptions {
  initialSeed?: string
  cameraFov?: number
  onSceneChange?: (newSeed: string) => void
}

/**
 * Custom hook to manage the lifecycle of a Three.js nebula scene (#544).
 * Properly disposes geometries, materials, textures, and models when
 * switching nebulae or unmounting to prevent unbounded memory growth.
 */
export function useNebulaScene(options: UseNebulaSceneOptions = {}) {
  const { initialSeed = 'nebula-default', cameraFov = 60, onSceneChange } = options

  const [seed, setSeed] = useState(initialSeed)
  const [scanCount, setScanCount] = useState(0)

  const sceneRef = useRef<THREE.Scene | null>(null)
  if (!sceneRef.current) {
    sceneRef.current = new THREE.Scene()
  }

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  if (!cameraRef.current) {
    cameraRef.current = new THREE.PerspectiveCamera(cameraFov, 1, 0.1, 1000)
    cameraRef.current.position.set(0, 0, 30)
  }

  const trackedResourcesRef = useRef<Set<DisposableResource>>(new Set())
  const eventListenersRef = useRef<Array<{ target: EventTarget; type: string; listener: EventListenerOrEventListenerObject }>>([])

  const trackResource = useCallback(<T extends DisposableResource>(resource: T): T => {
    if (resource && typeof resource.dispose === 'function') {
      trackedResourcesRef.current.add(resource)
    }
    return resource
  }, [])

  const untrackAndDispose = useCallback((resource?: DisposableResource | null) => {
    if (!resource) return
    trackedResourcesRef.current.delete(resource)
    try {
      resource.dispose?.()
    } catch {
      // ignore
    }
  }, [])

  const addTrackedEventListener = useCallback(
    (target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, listenerOptions?: boolean | AddEventListenerOptions) => {
      target.addEventListener(type, listener, listenerOptions)
      eventListenersRef.current.push({ target, type, listener })
    },
    []
  )

  const clearTrackedResources = useCallback(() => {
    trackedResourcesRef.current.forEach((res) => {
      try {
        res.dispose?.()
      } catch {
        // ignore
      }
    })
    trackedResourcesRef.current.clear()

    if (sceneRef.current) {
      cleanScene(sceneRef.current)
    }
  }, [])

  const clearTrackedEventListeners = useCallback(() => {
    eventListenersRef.current.forEach(({ target, type, listener }) => {
      try {
        target.removeEventListener(type, listener)
      } catch {
        // ignore
      }
    })
    eventListenersRef.current = []
  }, [])

  // Change active nebula / sector with proper disposal of the prior sector
  const changeNebula = useCallback(
    (newSeed: string) => {
      clearTrackedResources()
      setSeed(newSeed)
      setScanCount((prev) => prev + 1)
      onSceneChange?.(newSeed)
    },
    [clearTrackedResources, onSceneChange]
  )

  // Increment scan count and track scene stability
  const recordScan = useCallback(() => {
    setScanCount((prev) => prev + 1)
  }, [])

  // Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      clearTrackedResources()
      clearTrackedEventListeners()
      if (sceneRef.current) {
        cleanScene(sceneRef.current)
        sceneRef.current = null
      }
      cameraRef.current = null
    }
  }, [clearTrackedResources, clearTrackedEventListeners])

  return {
    scene: sceneRef.current,
    camera: cameraRef.current,
    activeSeed: seed,
    scanCount,
    changeNebula,
    recordScan,
    trackResource,
    untrackAndDispose,
    addTrackedEventListener,
    clearTrackedResources,
    disposeGeometry,
    disposeMaterial,
    disposeTexture,
    disposeHierarchy,
  }
}

export default useNebulaScene
