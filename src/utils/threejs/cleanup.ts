import { useEffect } from 'react'
import * as THREE from 'three'

export interface ThreeJsCleanupProps {
  /** Object3D refs with geometries and materials to dispose */
  objects?: THREE.Object3D[]
  /** Materials to dispose */
  materials?: THREE.Material[]
  /** Textures to dispose */
  textures?: THREE.Texture[]
  /** Renderer to dispose */
  renderer?: THREE.WebGLRenderer
}

export function useThreeJsCleanup({ objects, materials, textures, renderer }: ThreeJsCleanupProps) {
  useEffect(() => {
    return () => {
      objects?.forEach((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose()
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose?.())
          } else {
            obj.material.dispose?.()
          }
        }
      })

      materials?.forEach((material) => {
        material.dispose?.()
      })

      textures?.forEach((texture) => {
        texture.dispose?.()
      })

      if (renderer) {
        renderer.dispose?.()
        renderer.forceContextLoss()
      }
    }
  }, [objects, materials, textures, renderer])
}
