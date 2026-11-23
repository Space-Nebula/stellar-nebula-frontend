/**
 * Three.js Memory Cleanup & Disposal Utilities (#352)
 *
 * Provides comprehensive recursive disposal of geometries, materials,
 * textures, render targets, and WebGL contexts to eliminate memory leaks.
 */

import type * as THREE from 'three'

export interface DisposableResource {
  dispose?: () => void
}

export type AnyMaterial = THREE.Material & {
  map?: THREE.Texture | null
  lightMap?: THREE.Texture | null
  bumpMap?: THREE.Texture | null
  normalMap?: THREE.Texture | null
  specularMap?: THREE.Texture | null
  envMap?: THREE.Texture | null
  alphaMap?: THREE.Texture | null
  aoMap?: THREE.Texture | null
  displacementMap?: THREE.Texture | null
  emissiveMap?: THREE.Texture | null
  gradientMap?: THREE.Texture | null
  metalnessMap?: THREE.Texture | null
  roughnessMap?: THREE.Texture | null
  uniforms?: Record<string, { value?: unknown }>
}

/**
 * Safely disposes a Three.js texture.
 */
export function disposeTexture(texture?: THREE.Texture | null): void {
  if (!texture) return
  try {
    texture.dispose?.()
  } catch (error) {
    console.warn('[ThreeCleanup] Failed to dispose texture', error)
  }
}

/**
 * Safely disposes a Three.js geometry.
 */
export function disposeGeometry(geometry?: THREE.BufferGeometry | null): void {
  if (!geometry) return
  try {
    geometry.dispose?.()
  } catch (error) {
    console.warn('[ThreeCleanup] Failed to dispose geometry', error)
  }
}

/**
 * Safely disposes a Three.js material and any attached texture maps or shader uniforms.
 */
export function disposeMaterial(material?: THREE.Material | THREE.Material[] | null): void {
  if (!material) return

  if (Array.isArray(material)) {
    material.forEach((mat) => disposeMaterial(mat))
    return
  }

  const mat = material as AnyMaterial

  // Dispose all common texture maps attached to the material
  const textureSlots: Array<keyof AnyMaterial> = [
    'map',
    'lightMap',
    'bumpMap',
    'normalMap',
    'specularMap',
    'envMap',
    'alphaMap',
    'aoMap',
    'displacementMap',
    'emissiveMap',
    'gradientMap',
    'metalnessMap',
    'roughnessMap',
  ]

  for (const slot of textureSlots) {
    const tex = mat[slot] as THREE.Texture | undefined
    if (tex && typeof tex.dispose === 'function') {
      disposeTexture(tex)
      ;(mat as unknown as Record<string, unknown>)[slot] = null
    }
  }

  // Dispose textures inside shader uniforms if present
  if (mat.uniforms) {
    for (const key of Object.keys(mat.uniforms)) {
      const uniform = mat.uniforms[key]
      if (uniform?.value && typeof uniform.value === 'object') {
        const val = uniform.value as { dispose?: () => void }
        if (typeof val.dispose === 'function') {
          val.dispose()
        }
      }
    }
  }

  try {
    mat.dispose?.()
  } catch (error) {
    console.warn('[ThreeCleanup] Failed to dispose material', error)
  }
}

/**
 * Recursively traverses an Object3D hierarchy, disposing all child geometries,
 * materials, and textures, and removing children from the parent.
 */
export function disposeHierarchy(root?: THREE.Object3D | null): void {
  if (!root) return

  // This runs from effect cleanup, where throwing would break unmounting. A
  // scene-like object without `traverse` or a `children` array (a partial test
  // double, or one that is already torn down) is therefore skipped, not crashed on.
  if (typeof root.traverse === 'function') {
    root.traverse((child) => {
      const mesh = child as THREE.Mesh & {
        geometry?: THREE.BufferGeometry
        material?: THREE.Material | THREE.Material[]
      }

      if (mesh.geometry) {
        disposeGeometry(mesh.geometry)
      }

      if (mesh.material) {
        disposeMaterial(mesh.material)
      }
    })
  }

  // Detach children. Iterate a snapshot: `remove` mutates `root.children`.
  if (Array.isArray(root.children) && typeof root.remove === 'function') {
    for (const child of [...root.children]) {
      root.remove(child)
    }
  }
}

/**
 * Disposes a WebGLRenderer, clears its render lists, and triggers WebGL context loss.
 */
export function disposeWebGLRenderer(renderer?: THREE.WebGLRenderer | null): void {
  if (!renderer) return
  try {
    renderer.renderLists?.dispose?.()
    renderer.dispose?.()
    renderer.forceContextLoss?.()
    if (renderer.domElement && renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
  } catch (error) {
    console.warn('[ThreeCleanup] Failed to dispose WebGL renderer', error)
  }
}

/**
 * Comprehensive scene cleanup function that disposes scene hierarchy,
 * textures, materials, and renderer.
 */
export function cleanScene(
  scene?: THREE.Scene | null,
  renderer?: THREE.WebGLRenderer | null
): void {
  if (scene) {
    disposeHierarchy(scene)
    scene.clear?.()
  }
  if (renderer) {
    disposeWebGLRenderer(renderer)
  }
}
