import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from 'three'
import type { Points, ShaderMaterial } from 'three'
import { particleVertexShader, particleFragmentShader, particlePerfFragmentShader } from './shaders'
import { useThreeJsLod } from '@/utils/threejs/lod'

// ─── Device detection ────────────────────────────────────────────────────────

function useDeviceHints() {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, prefersReducedMotion: false }
    }

    const nav = navigator as Navigator & {
      userAgentData?: { mobile?: boolean }
    }

    const isMobile =
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(max-width: 768px)').matches ||
      nav.userAgentData?.mobile === true

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    return { isMobile, prefersReducedMotion }
  }, [])
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PARTICLE_COUNT = 50000
const MIN_PARTICLE_COUNT = 10000
const CORE_RADIUS = 12

const NEBULA_PALETTE = [
  new Color('#fdf4ff'),
  new Color('#f0abfc'),
  new Color('#c084fc'),
  new Color('#a78bfa'),
  new Color('#818cf8'),
  new Color('#60a5fa'),
  new Color('#38bdf8'),
  new Color('#22d3ee'),
]

// ─── Geometry ─────────────────────────────────────────────────────────────────

function lerpColor(a: Color, b: Color, t: number): Color {
  return new Color(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t)
}

function sampleNebulaColor(t: number): Color {
  const clamped = Math.max(0, Math.min(1, t))
  const idx = clamped * (NEBULA_PALETTE.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, NEBULA_PALETTE.length - 1)
  const frac = idx - lo
  return lerpColor(NEBULA_PALETTE[lo], NEBULA_PALETTE[hi], frac)
}

function randomSpherePoint(radius: number, flattenY = 1) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const x = radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.sin(phi) * Math.sin(theta) * flattenY
  const z = radius * Math.cos(phi)
  return { x, y, z }
}

function createNebulaGeometry(particleCount: number, performanceMode: boolean) {
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const colors = new Float32Array(particleCount * 3)
  const opacities = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    const roll = Math.random()
    let x: number
    let y: number
    let z: number
    let size: number
    let colorT: number
    let opacity: number

    if (roll < 0.12) {
      const pt = randomSpherePoint(CORE_RADIUS * (0.5 + Math.random()), 0.8)
      x = pt.x + (Math.random() - 0.5) * 4
      y = pt.y + (Math.random() - 0.5) * 3
      z = pt.z + (Math.random() - 0.5) * 4
      size = 0.8 + Math.random() * 2.0
      colorT = 0.02 + Math.random() * 0.12
      opacity = 0.65 + Math.random() * 0.35
    } else if (roll < 0.45) {
      const angle = Math.random() * Math.PI * 2
      const radius = CORE_RADIUS + Math.random() * 35
      const falloff = 1 - (radius - CORE_RADIUS) / 35
      x = Math.cos(angle) * radius
      z = Math.sin(angle) * radius
      y = (Math.random() - 0.5) * 12 * falloff
      size = 1.4 + Math.random() * 3.8
      colorT = 0.08 + Math.random() * 0.35
      opacity = 0.45 + Math.random() * 0.4
    } else if (roll < 0.78) {
      const angle = Math.random() * Math.PI * 2
      const radius = 38 + Math.random() * 32
      const offsetAngle = angle + (Math.random() - 0.5) * 0.6
      x = Math.cos(offsetAngle) * radius + (Math.random() - 0.5) * 10
      z = Math.sin(offsetAngle) * radius + (Math.random() - 0.5) * 10
      y = (Math.random() - 0.5) * 8
      size = 2.2 + Math.random() * 5.0
      colorT = 0.25 + (radius / 75) * 0.55
      opacity = 0.3 + Math.random() * 0.4
    } else {
      const angle = Math.random() * Math.PI * 2
      const radius = 50 + Math.random() * 30
      const height = (Math.random() - 0.5) * 18
      x = Math.cos(angle) * radius
      z = Math.sin(angle) * radius
      y = height
      size = 3.5 + Math.random() * 6.5
      colorT = 0.5 + (radius / 85) * 0.5
      opacity = 0.18 + Math.random() * 0.32
    }

    const pi = i * 3
    positions[pi] = x
    positions[pi + 1] = y
    positions[pi + 2] = z
    sizes[i] = performanceMode ? size * 0.7 : size
    opacities[i] = performanceMode ? opacity * 0.6 : opacity

    const color = sampleNebulaColor(colorT)
    colors[pi] = color.r
    colors[pi + 1] = color.g
    colors[pi + 2] = color.b
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  geometry.setAttribute('aOpacity', new BufferAttribute(opacities, 1))
  return geometry
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ParticleSystemProps {
  density?: number
  performanceMode?: boolean
}

export function ParticleSystem({ density = 0.8, performanceMode = false }: ParticleSystemProps) {
  const pointsRef = useRef<Points>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const { isMobile, prefersReducedMotion } = useDeviceHints()
  const lodParticleCount = useThreeJsLod({
    lowDetailDistance: 20,
    mediumDetailDistance: 10,
    highDetailDistance: 5,
    maxParticles: MAX_PARTICLE_COUNT * 0.8,
    minParticles: MIN_PARTICLE_COUNT,
  })

  const effectiveDensity = Math.min(1.2, Math.max(0.3, density))
  const baseCount = MAX_PARTICLE_COUNT * effectiveDensity
  const performanceFactor = performanceMode ? 0.35 : 0.5
  const particleCount = Math.max(
    MIN_PARTICLE_COUNT,
    Math.round(lodParticleCount * performanceFactor)
  )

  const geometry = useMemo(
    () => createNebulaGeometry(particleCount, performanceMode || isMobile),
    [particleCount, performanceMode, isMobile]
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRotationSpeed: { value: prefersReducedMotion ? 0.02 : 0.06 },
    }),
    [prefersReducedMotion]
  )

  const shader = performanceMode || isMobile ? particlePerfFragmentShader : particleFragmentShader
  const blending = AdditiveBlending

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime
    }

    if (pointsRef.current) {
      const speed = prefersReducedMotion ? 0.02 : 0.06
      pointsRef.current.rotation.y += speed * 0.016
      pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.07) * 0.03
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        transparent
        depthWrite={false}
        depthTest={true}
        vertexShader={particleVertexShader}
        fragmentShader={shader}
        blending={blending}
        uniforms={uniforms}
      />
    </points>
  )
}
