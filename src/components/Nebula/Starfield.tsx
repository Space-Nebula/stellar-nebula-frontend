import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'
import type { Points, ShaderMaterial } from 'three'
import { starfieldVertexShader, starfieldFragmentShader } from './shaders'

interface StarfieldProps {
  density: number
  performanceMode?: boolean
}

const BASE_STAR_COUNT = 4200
const STARFIELD_RADIUS = 180
const STARFIELD_DEPTH = 120
const PARALLAX_STRENGTH = 0.018

const STAR_COLOR_PALETTE = [
  new Color('#f8fafc'),
  new Color('#dbeafe'),
  new Color('#c4b5fd'),
  new Color('#bae6fd'),
]

function createStarfieldGeometry(starCount: number) {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(starCount * 3)
  const sizes = new Float32Array(starCount)
  const phases = new Float32Array(starCount)
  const twinkleSpeeds = new Float32Array(starCount)
  const opacities = new Float32Array(starCount)
  const parallaxValues = new Float32Array(starCount)
  const colors = new Float32Array(starCount * 3)

  for (let index = 0; index < starCount; index += 1) {
    const radius = STARFIELD_RADIUS + Math.random() * STARFIELD_DEPTH
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)

    const positionIndex = index * 3
    positions[positionIndex] = x
    positions[positionIndex + 1] = y
    positions[positionIndex + 2] = z

    sizes[index] = 0.55 + Math.random() * 1.25
    phases[index] = Math.random() * Math.PI * 2
    twinkleSpeeds[index] = 0.35 + Math.random() * 0.55
    opacities[index] = 0.24 + Math.random() * 0.38
    parallaxValues[index] = 0.12 + Math.random() * 0.88

    const color = STAR_COLOR_PALETTE[Math.floor(Math.random() * STAR_COLOR_PALETTE.length)]
    colors[positionIndex] = color.r
    colors[positionIndex + 1] = color.g
    colors[positionIndex + 2] = color.b
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
  geometry.setAttribute('aTwinkleSpeed', new BufferAttribute(twinkleSpeeds, 1))
  geometry.setAttribute('aOpacity', new BufferAttribute(opacities, 1))
  geometry.setAttribute('aParallax', new BufferAttribute(parallaxValues, 1))
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  return geometry
}

export function Starfield({ density, performanceMode = false }: StarfieldProps) {
  const pointsRef = useRef<Points>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const { camera } = useThree()

  const starCount = useMemo(() => {
    const clampedDensity = Math.min(1.5, Math.max(0.4, density))
    const performanceFactor = performanceMode ? 0.72 : 1
    return Math.round(BASE_STAR_COUNT * clampedDensity * performanceFactor)
  }, [density, performanceMode])

  const geometry = useMemo(() => createStarfieldGeometry(starCount), [starCount])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uParallaxStrength: { value: performanceMode ? PARALLAX_STRENGTH * 0.7 : PARALLAX_STRENGTH },
      uCameraPosition: { value: new Vector3() },
    }),
    [performanceMode]
  )

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime
      materialRef.current.uniforms.uCameraPosition.value.copy(camera.position)
    }

    if (pointsRef.current) {
      pointsRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.01) * 0.015
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        transparent
        depthWrite={false}
        depthTest={false}
        vertexShader={starfieldVertexShader}
        fragmentShader={starfieldFragmentShader}
        blending={AdditiveBlending}
        uniforms={uniforms}
      />
    </points>
  )
}
