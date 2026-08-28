/* eslint-disable */
import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Group, Mesh, Object3D } from 'three'
import type { ShipClass } from '@/types/game'

interface ShipModelProps {
  shipClass: ShipClass
  position?: [number, number, number]
  scale?: number
  autoRotate?: boolean
  rotationSpeed?: number
  performanceMode?: boolean
}

const SHIP_MODEL_PATHS: Record<ShipClass, string> = {
  scout: '/models/ships/scout.gltf',
  freighter: '/models/ships/freighter.gltf',
  warship: '/models/ships/warship.gltf',
  explorer: '/models/ships/explorer.gltf',
}

// Fallback geometry for when models aren't available
function FallbackShip({ shipClass }: { shipClass: ShipClass }) {
  const meshRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  const colors: Record<ShipClass, string> = {
    scout: '#06b6d4',
    freighter: '#a78bfa',
    warship: '#ef4444',
    explorer: '#22c55e',
  }

  return (
    <group ref={meshRef}>
      <mesh>
        <coneGeometry args={[0.3, 1.2, 8]} />
        <meshStandardMaterial
          color={colors[shipClass]}
          emissive={colors[shipClass]}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

function LoadedShip({
  model,
  autoRotate = true,
  rotationSpeed = 0.5,
  scale = 1,
}: {
  model: GLTF
  autoRotate?: boolean
  rotationSpeed?: number
  scale?: number
}) {
  const groupRef = useRef<Group>(null)
  const [clonedScene, setClonedScene] = useState<Object3D | null>(null)

  useEffect(() => {
    if (model.scene) {
      const cloned = model.scene.clone()
      cloned.traverse((child: Object3D) => {
        const mesh = child as Mesh
        if (mesh.isMesh) {
          mesh.castShadow = true
          mesh.receiveShadow = true
        }
      })
      setClonedScene(cloned)
    }
  }, [model])

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * rotationSpeed
    }
  })

  if (!clonedScene) return null

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  )
}

export function ShipModel({
  shipClass,
  position = [0, 0, 0],
  scale = 1,
  autoRotate = true,
  rotationSpeed = 0.5,
  performanceMode = false,
}: ShipModelProps) {
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [error, setError] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    setLoading(true)
    setError(false)

    const loader = new GLTFLoader()
    const modelPath = SHIP_MODEL_PATHS[shipClass]

    loader.load(
      modelPath,
      (loadedGltf) => {
        setGltf(loadedGltf)
        setLoading(false)
      },
      undefined,
      (err) => {
        console.warn(`Failed to load ship model for ${shipClass}:`, err)
        setError(true)
        setLoading(false)
      }
    )
  }, [shipClass])

  if (loading) {
    return (
      <group position={position}>
        <FallbackShip shipClass={shipClass} />
      </group>
    )
  }

  if (error || !gltf) {
    return (
      <group position={position}>
        <FallbackShip shipClass={shipClass} />
      </group>
    )
  }

  if (performanceMode) {
    // Skip LOD in performance mode
    return (
      <group position={position}>
        <LoadedShip
          model={gltf}
          autoRotate={autoRotate}
          rotationSpeed={rotationSpeed}
          scale={scale}
        />
      </group>
    )
  }

  return (
    <group position={position}>
      <LoadedShip
        model={gltf}
        autoRotate={autoRotate}
        rotationSpeed={rotationSpeed}
        scale={scale}
      />
    </group>
  )
}
