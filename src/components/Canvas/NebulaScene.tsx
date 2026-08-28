import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { ParticleSystem, Starfield, InteractiveScanPoints, ProceduralNebulaField } from '../Nebula'
import { ShipModel } from './ShipModel'
import { trackEvent } from '../../services/analytics'
import type { ResourceType, RarityTier } from '../../types/game'
import { useScanCooldown } from '../../hooks/useScanCooldown'
import { useProceduralNebula } from '../../hooks/useProceduralNebula'
import { rollScanReward, rollResourceAmount } from '../../utils/rarity'
import { createRNG } from '../../utils/procedural/nebula'
import { SCAN_COOLDOWN_MS, SCAN_CHANNEL_DURATION_SEC } from '../../constants/game'

const NEBULA_SEED = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'

function NebulaSphere() {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1
      meshRef.current.rotation.x += delta * 0.05
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <meshStandardMaterial
        color="#7c3aed"
        emissive="#4c1d95"
        emissiveIntensity={0.68}
        wireframe={false}
        transparent
        opacity={0.82}
      />
    </mesh>
  )
}

interface NebulaSceneProps {
  starfieldDensity: number
  performanceMode?: boolean
  onScanComplete?: (resourceType: ResourceType, amount: number) => void
}

function createInitialRng() {
  return createRNG(Date.now())
}

export function NebulaScene({ starfieldDensity, performanceMode = false }: NebulaSceneProps) {
  const [scanningPoints, setScanningPoints] = useState<Set<string>>(new Set())
  const [rarityMap, setRarityMap] = useState<Record<string, RarityTier>>({})
  const { getRemainingSeconds, startCooldown, canScan } = useScanCooldown()
  const scanRngRef = useRef(createInitialRng())

  const nebulaConfig = useMemo(
    () => ({
      seed: NEBULA_SEED,
      particleCount: performanceMode ? 5000 : 15000,
      radius: 40,
    }),
    [performanceMode]
  )

  const { geometry: nebulaGeometry } = useProceduralNebula(nebulaConfig)

  const handleScan = useCallback(
    (pointId: string, resourceType: ResourceType, amount: number) => {
      if (!canScan(pointId)) return

      setScanningPoints((prev) => new Set([...prev, pointId]))
      trackEvent('scan_started', { pointId, resourceType, amount })

      setTimeout(() => {
        setScanningPoints((prev) => {
          const next = new Set(prev)
          next.delete(pointId)
          return next
        })

        const reward = rollScanReward(resourceType, scanRngRef.current)
        const finalAmount = rollResourceAmount(amount, reward.rarity)

        setRarityMap((prev) => ({ ...prev, [pointId]: reward.rarity }))
        startCooldown(pointId, SCAN_COOLDOWN_MS)

        trackEvent('scan_completed', {
          pointId,
          resourceType,
          amount: finalAmount,
          rarity: reward.rarity,
        })
      }, SCAN_CHANNEL_DURATION_SEC * 1000)
    },
    [canScan, startCooldown]
  )

  const remainingSecondsMap: Record<string, number> = {}
  for (const id of ['scan-1', 'scan-2', 'scan-3', 'scan-4']) {
    remainingSecondsMap[id] = getRemainingSeconds(id)
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#a78bfa" />
      <pointLight position={[-10, -5, -10]} intensity={0.8} color="#06b6d4" />
      <ParticleSystem performanceMode={performanceMode} />
      <Starfield density={starfieldDensity} performanceMode={performanceMode} />
      <InteractiveScanPoints
        onScan={handleScan}
        cooldowns={remainingSecondsMap}
        remainingSecondsMap={remainingSecondsMap}
        scanningPoints={scanningPoints}
        rarityMap={rarityMap}
      />
      {nebulaGeometry ? (
        <ProceduralNebulaField geometry={nebulaGeometry} performanceMode={performanceMode} />
      ) : (
        <NebulaSphere />
      )}
      <ShipModel
        shipClass="scout"
        position={[3, 0, 0]}
        scale={0.8}
        autoRotate
        rotationSpeed={0.3}
        performanceMode={performanceMode}
      />
      <ShipModel
        shipClass="freighter"
        position={[-3, 1, -1]}
        scale={0.6}
        autoRotate
        rotationSpeed={0.2}
        performanceMode={performanceMode}
      />
      <ShipModel
        shipClass="warship"
        position={[0, -2, 2]}
        scale={0.7}
        autoRotate
        rotationSpeed={0.4}
        performanceMode={performanceMode}
      />
      <ShipModel
        shipClass="explorer"
        position={[2, 2, -2]}
        scale={0.5}
        autoRotate
        rotationSpeed={0.25}
        performanceMode={performanceMode}
      />
    </>
  )
}
