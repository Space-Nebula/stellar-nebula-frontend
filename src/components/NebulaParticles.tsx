import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  type InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three'
import type { QualitySetting } from '@/hooks/useDevicePerformance'
import { PARTICLE_BUDGETS } from '@/hooks/useDevicePerformance'
import { disposeGeometry, disposeMaterial } from '@/utils/three-cleanup'

export interface NebulaParticlesProps {
  quality?: QualitySetting
  particleCount?: number
  simplifiedShaders?: boolean
  performanceMode?: boolean
  radius?: number
  colorPalette?: Color[]
  rotationSpeed?: number
  onDisposed?: () => void
}

const DEFAULT_PALETTE = [
  new Color('#fdf4ff'),
  new Color('#f0abfc'),
  new Color('#c084fc'),
  new Color('#a78bfa'),
  new Color('#818cf8'),
  new Color('#60a5fa'),
  new Color('#38bdf8'),
  new Color('#22d3ee'),
]

function sampleNebulaColor(palette: Color[], t: number): Color {
  const clamped = Math.max(0, Math.min(1, t))
  const idx = clamped * (palette.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, palette.length - 1)
  const frac = idx - lo
  const a = palette[lo]
  const b = palette[hi]
  return new Color(a.r + (b.r - a.r) * frac, a.g + (b.g - a.g) * frac, a.b + (b.b - a.b) * frac)
}

/**
 * NebulaParticles component utilizing THREE.InstancedMesh for batched particle rendering
 * with explicit resource disposal on unmount (#544, #548).
 *
 * Collapses thousands of draw calls into a single batched call while preventing memory
 * leaks by thoroughly disposing geometries and materials on cleanup.
 */
export function NebulaParticles({
  quality = 'medium',
  particleCount,
  simplifiedShaders = false,
  performanceMode = false,
  radius: customRadius = 45,
  colorPalette = DEFAULT_PALETTE,
  rotationSpeed,
  onDisposed,
}: NebulaParticlesProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const nebulaCenter = useMemo(() => new Vector3(0, 0, 0), [])

  // Acceptance Criterion: "Low" quality mode uses <= 3k particles
  const baseBudget = PARTICLE_BUDGETS[quality] ?? 6000
  const maxInstances = particleCount ?? (performanceMode ? Math.min(3000, baseBudget) : baseBudget)

  // Shared low-poly geometry for instancing (drastically lowers vertex processing on mobile)
  const sphereSegments = quality === 'low' || simplifiedShaders || performanceMode ? 4 : 6
  const geometry = useMemo(() => new SphereGeometry(0.35, sphereSegments, sphereSegments), [sphereSegments])

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        transparent: true,
        opacity: quality === 'low' || performanceMode ? 0.75 : 0.85,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [quality, performanceMode]
  )

  // Precompute instance transformation matrices and vertex colors
  const particleTransforms = useMemo(() => {
    const transforms: { x: number; y: number; z: number; scale: number; color: Color; speed: number }[] = []

    for (let i = 0; i < maxInstances; i++) {
      const radius = 5 + Math.random() * customRadius
      const angle = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 16 * (1 - radius / (customRadius + 10))
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 6
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 6
      const scale = 0.6 + Math.random() * (quality === 'low' || performanceMode ? 1.4 : 2.0)
      const colorT = Math.min(1, radius / customRadius)
      const color = sampleNebulaColor(colorPalette, colorT)
      const speed = 0.005 + Math.random() * 0.015

      transforms.push({ x, y, z, scale, color, speed })
    }

    return transforms
  }, [maxInstances, quality, performanceMode, customRadius, colorPalette])

  // Initialize instances on mount or count change
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    for (let i = 0; i < particleTransforms.length; i++) {
      const p = particleTransforms[i]
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.set(p.scale, p.scale, p.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, p.color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [particleTransforms, dummy])

  // Level-of-Detail (LOD) and rotation per frame
  useFrame(({ camera, clock }) => {
    const mesh = meshRef.current
    if (!mesh) return

    // LOD: Adjust visible particle count based on camera distance
    const dist = camera.position.distanceTo(nebulaCenter)
    let lodFactor = 1.0

    if (dist > 70) {
      lodFactor = 0.5 // Far away: draw 50% particles
    } else if (dist > 40) {
      lodFactor = 0.75 // Mid distance: draw 75% particles
    }

    const visibleCount = Math.floor(maxInstances * lodFactor)
    if (mesh.count !== visibleCount) {
      mesh.count = visibleCount
    }

    // Gentle orbit rotation
    const defaultRate = quality === 'low' || simplifiedShaders || performanceMode ? 0.02 : 0.04
    const rate = rotationSpeed ?? defaultRate
    mesh.rotation.y = clock.elapsedTime * rate * 0.1
  })

  // Cleanup WebGL resources on unmount (#544)
  useEffect(() => {
    return () => {
      disposeGeometry(geometry)
      disposeMaterial(material)
      onDisposed?.()
    }
  }, [geometry, material, onDisposed])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, maxInstances]}
      frustumCulled={false}
      usage={DynamicDrawUsage}
    />
  )
}

export default NebulaParticles
