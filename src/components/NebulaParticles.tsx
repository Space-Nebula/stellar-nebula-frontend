import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Points,
  ShaderMaterial,
} from 'three'
import {
  particleVertexShader,
  particleFragmentShader,
  particlePerfFragmentShader,
} from './Nebula/shaders'
import { disposeGeometry, disposeMaterial } from '@/utils/three-cleanup'

export interface NebulaParticlesProps {
  particleCount?: number
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

function samplePaletteColor(palette: Color[], t: number): Color {
  const clamped = Math.max(0, Math.min(1, t))
  const idx = clamped * (palette.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, palette.length - 1)
  const frac = idx - lo
  const c1 = palette[lo]
  const c2 = palette[hi]
  return new Color(c1.r + (c2.r - c1.r) * frac, c1.g + (c2.g - c1.g) * frac, c1.b + (c2.b - c1.b) * frac)
}

/**
 * NebulaParticles component with explicit Three.js resource disposal (#544).
 * Prevents memory leaks by ensuring geometries, shader materials, and buffer
 * attributes are properly disposed on unmount or particle count change.
 */
export function NebulaParticles({
  particleCount = 12000,
  performanceMode = false,
  radius = 40,
  colorPalette = DEFAULT_PALETTE,
  rotationSpeed = 0.05,
  onDisposed,
}: NebulaParticlesProps) {
  const pointsRef = useRef<Points>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const geometryRef = useRef<BufferGeometry | null>(null)

  // Construct BufferGeometry
  const geometry = useMemo(() => {
    // If there was a previous geometry, dispose it before creating a new one
    if (geometryRef.current) {
      disposeGeometry(geometryRef.current)
    }

    const geom = new BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const colors = new Float32Array(particleCount * 3)
    const opacities = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random()
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.cbrt(u) * radius

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.7
      const z = r * Math.cos(phi)

      const pi = i * 3
      positions[pi] = x
      positions[pi + 1] = y
      positions[pi + 2] = z

      sizes[i] = performanceMode ? 1.0 + Math.random() * 2.0 : 1.5 + Math.random() * 3.5
      opacities[i] = 0.3 + Math.random() * 0.7

      const col = samplePaletteColor(colorPalette, r / radius)
      colors[pi] = col.r
      colors[pi + 1] = col.g
      colors[pi + 2] = col.b
    }

    geom.setAttribute('position', new BufferAttribute(positions, 3))
    geom.setAttribute('aSize', new BufferAttribute(sizes, 1))
    geom.setAttribute('aColor', new BufferAttribute(colors, 3))
    geom.setAttribute('aOpacity', new BufferAttribute(opacities, 1))
    geom.computeBoundingSphere()

    geometryRef.current = geom
    return geom
  }, [particleCount, performanceMode, radius, colorPalette])

  // Construct ShaderMaterial
  const material = useMemo(() => {
    if (materialRef.current) {
      disposeMaterial(materialRef.current)
    }

    const mat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRotationSpeed: { value: rotationSpeed },
      },
      vertexShader: particleVertexShader,
      fragmentShader: performanceMode ? particlePerfFragmentShader : particleFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    })

    materialRef.current = mat
    return mat
  }, [performanceMode, rotationSpeed])

  // Lifecycle disposal cleanup
  useEffect(() => {
    const currentGeom = geometry
    const currentMat = material

    return () => {
      disposeGeometry(currentGeom)
      disposeMaterial(currentMat)
      if (geometryRef.current === currentGeom) {
        geometryRef.current = null
      }
      if (materialRef.current === currentMat) {
        materialRef.current = null
      }
      onDisposed?.()
    }
  }, [geometry, material, onDisposed])

  // Frame animation
  useFrame(({ clock }) => {
    if (materialRef.current?.uniforms?.uTime) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += rotationSpeed * 0.016
    }
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
}

export default NebulaParticles
