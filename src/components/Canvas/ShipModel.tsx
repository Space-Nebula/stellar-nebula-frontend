import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Mesh, type Group, type Object3D } from 'three'
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

// Single shared loader instance - GLTFLoader is stateless between load() calls.
const gltfLoader = new GLTFLoader()

// Cache in-flight/completed loads by model path so multiple ShipModel
// instances of the same class (see NebulaScene) don't each issue their own
// network request for the same .gltf file.
const gltfCache = new Map<string, Promise<GLTF>>()

function loadShipModel(path: string): Promise<GLTF> {
  const cached = gltfCache.get(path)
  if (cached) return cached

  const promise = new Promise<GLTF>((resolve, reject) => {
    gltfLoader.load(path, resolve, undefined, reject)
  })
  gltfCache.set(path, promise)
  return promise
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
  scale = 1,
  autoRotate = true,
  rotationSpeed = 0.5,
}: {
  model: GLTF
  scale?: number
  autoRotate?: boolean
  rotationSpeed?: number
}) {
  const groupRef = useRef<Group>(null)

  const clonedScene = useMemo(() => {
    if (!model.scene) return null
    const cloned = model.scene.clone()
    cloned.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return cloned
  }, [model.scene])

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

/**
 * Renders a ship's GLTF model, with an automatic procedural fallback while
 * loading or if the asset for `shipClass` is unavailable (see
 * public/models/ships/README.md for the expected filenames).
 */
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
  const modelPath = useMemo(() => SHIP_MODEL_PATHS[shipClass], [shipClass])

  useEffect(() => {
    let cancelled = false

    loadShipModel(modelPath)
      .then((loadedGltf) => {
        if (cancelled) return
        setGltf(loadedGltf)
        setError(false)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.warn(`Failed to load ship model for ${shipClass}:`, err)
        setError(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shipClass, modelPath])

  if (loading || error || !gltf) {
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
