import { useEffect, useRef } from 'react'
import { createResourceTracker } from '@/utils/performance/memoryLeakTracker'

/**
 * Hook that creates and automatically disposes a Three.js resource tracker
 * when the component unmounts.
 *
 * Use to detect leaked geometries, materials, and textures.
 *
 * @example
 * const tracker = useRenderResourceTracker()
 * tracker.track(mesh.geometry, 'geometry')
 */
export function useRenderResourceTracker() {
  const trackerRef = useRef(createResourceTracker())

  useEffect(() => {
    return () => {
      trackerRef.current.dispose()
    }
  }, [])

  return trackerRef.current
}
