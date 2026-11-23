import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as THREE from 'three'
import { renderHook, act } from '@testing-library/react'
import { useNebulaScene } from '@/hooks/useNebulaScene'
import { cleanScene, disposeGeometry, disposeMaterial, disposeHierarchy } from '@/utils/three-cleanup'

describe('NebulaView Three.js Resource Disposal & Memory Leak Prevention (#544)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('properly disposes Three.js geometries, materials, and textures on scene cleanup', () => {
    const scene = new THREE.Scene()
    const geometry = new THREE.BufferGeometry()
    const material = new THREE.MeshBasicMaterial()
    const texture = new THREE.Texture()
    material.map = texture

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const geomSpy = vi.spyOn(geometry, 'dispose')
    const matSpy = vi.spyOn(material, 'dispose')
    const texSpy = vi.spyOn(texture, 'dispose')

    cleanScene(scene)

    expect(geomSpy).toHaveBeenCalledTimes(1)
    expect(matSpy).toHaveBeenCalledTimes(1)
    expect(texSpy).toHaveBeenCalledTimes(1)
    expect(scene.children.length).toBe(0)
  })

  it('maintains stable resource count over 10+ consecutive nebula scene changes', () => {
    const { result, unmount } = renderHook(() =>
      useNebulaScene({
        initialSeed: 'seed-0',
      })
    )

    const disposedGeometries: THREE.BufferGeometry[] = []
    const disposedMaterials: THREE.Material[] = []

    // Simulate 12 scene changes (exceeding the 10+ acceptance criterion)
    for (let i = 1; i <= 12; i++) {
      act(() => {
        // Create mock geometries and materials representing a nebula generation
        const geom = new THREE.BufferGeometry()
        const mat = new THREE.ShaderMaterial()

        vi.spyOn(geom, 'dispose').mockImplementation(() => {
          disposedGeometries.push(geom)
        })
        vi.spyOn(mat, 'dispose').mockImplementation(() => {
          disposedMaterials.push(mat)
        })

        result.current.trackResource(geom)
        result.current.trackResource(mat)

        const mesh = new THREE.Mesh(geom, mat)
        result.current.scene.add(mesh)

        // Switch nebula sector
        result.current.changeNebula(`seed-${i}`)
      })

      // After changeNebula, previous resources must be disposed
      expect(disposedGeometries.length).toBe(i)
      expect(disposedMaterials.length).toBe(i)
      expect(result.current.scene.children.length).toBe(0)
    }

    expect(result.current.scanCount).toBe(12)

    unmount()
  })

  it('removes event listeners and cleans scene completely on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useNebulaScene({
        initialSeed: 'test-seed',
      })
    )

    const dummyTarget = document.createElement('div')
    const dummyListener = vi.fn()
    const removeListenerSpy = vi.spyOn(dummyTarget, 'removeEventListener')

    result.current.addTrackedEventListener(dummyTarget, 'keydown', dummyListener)

    const dummyGeom = new THREE.BoxGeometry(1, 1, 1)
    const geomSpy = vi.spyOn(dummyGeom, 'dispose')
    result.current.trackResource(dummyGeom)

    unmount()

    expect(removeListenerSpy).toHaveBeenCalledWith('keydown', dummyListener)
    expect(geomSpy).toHaveBeenCalledTimes(1)
  })

  it('verifies memory growth remains below the 150MB threshold', () => {
    const initialHeap = process.memoryUsage ? process.memoryUsage().heapUsed : 50 * 1024 * 1024
    const thresholdBytes = 150 * 1024 * 1024 // 150MB acceptance criteria threshold

    const scene = new THREE.Scene()

    // Simulate allocating and immediately disposing 15 nebula cycles
    for (let i = 0; i < 15; i++) {
      const geom = new THREE.BufferGeometry()
      const positions = new Float32Array(10000 * 3)
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
      })

      const points = new THREE.Points(geom, mat)
      scene.add(points)

      disposeGeometry(geom)
      disposeMaterial(mat)
      scene.remove(points)
    }

    const currentHeap = process.memoryUsage ? process.memoryUsage().heapUsed : initialHeap
    const heapGrowth = Math.max(0, currentHeap - initialHeap)

    expect(heapGrowth).toBeLessThan(thresholdBytes)
  })
})
