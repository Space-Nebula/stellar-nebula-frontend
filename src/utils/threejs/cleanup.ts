import { useEffect } from 'react'
import type * as THREE from 'three'

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

type DisposableObject = THREE.Object3D & {
  geometry?: THREE.BufferGeometry
  material?: THREE.Material | THREE.Material[]
}

export function disposeThreeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const item = child as DisposableObject
    if (item.geometry) {
      item.geometry.dispose?.()
    }
    if (item.material) {
      if (Array.isArray(item.material)) {
        item.material.forEach((mat) => mat.dispose?.())
      } else {
        item.material.dispose?.()
      }
    }
  })
}

export function useThreeJsCleanup({ objects, materials, textures, renderer }: ThreeJsCleanupProps) {
  useEffect(() => {
    return () => {
      objects?.forEach((obj) => {
        disposeThreeObject(obj)
      })

      materials?.forEach((material) => {
        material.dispose?.()
      })

      textures?.forEach((texture) => {
        texture.dispose?.()
      })

      if (renderer) {
        renderer.dispose?.()
        renderer.forceContextLoss?.()
      }
    }
  }, [objects, materials, textures, renderer])
}

export default useThreeJsCleanup
