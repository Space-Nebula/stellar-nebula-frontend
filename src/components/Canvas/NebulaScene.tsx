import { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { ParticleSystem, Starfield, InteractiveScanPoints, ShipModel } from '../Nebula'
import { trackEvent } from '../../services/analytics'
import type { ResourceType } from '../../types/game'

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
}

export function NebulaScene({ starfieldDensity, performanceMode = false }: NebulaSceneProps) {
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const [scanningPoints, setScanningPoints] = useState<Set<string>>(new Set())

  const handleScan = useCallback((pointId: string, resourceType: ResourceType, amount: number) => {
    setScanningPoints((prev) => new Set([...prev, pointId]))
    trackEvent('scan_started', { pointId, resourceType, amount })

    setTimeout(() => {
      setScanningPoints((prev) => {
        const next = new Set(prev)
        next.delete(pointId)
        return next
      })

      setCooldowns((prev) => ({ ...prev, [pointId]: 5 }))
      trackEvent('scan_completed', { pointId, resourceType, amount })

      setTimeout(() => {
        setCooldowns((prev) => {
          const next = { ...prev }
          delete next[pointId]
          return next
        })
      }, 5000)
    }, 2000)
  }, [])

  // Update cooldowns
  useFrame((_state, delta: number) => {
    setCooldowns((prev) => {
      const next = { ...prev }
      let hasChanges = false

      Object.keys(next).forEach((key) => {
        if (next[key] > 0) {
          next[key] -= delta
          if (next[key] <= 0) {
            delete next[key]
            hasChanges = true
          }
        }
      })

      return hasChanges ? next : prev
    })
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#a78bfa" />
      <pointLight position={[-10, -5, -10]} intensity={0.8} color="#06b6d4" />
      <ParticleSystem performanceMode={performanceMode} />
      <Starfield density={starfieldDensity} performanceMode={performanceMode} />
      <InteractiveScanPoints 
        onScan={handleScan}
        cooldowns={cooldowns}
        scanningPoints={scanningPoints}
      />
      <NebulaSphere />
      <ShipModel shipClass="scout" position={[3, 0, 0]} scale={0.8} autoRotate rotationSpeed={0.3} performanceMode={performanceMode} />
      <ShipModel shipClass="freighter" position={[-3, 1, -1]} scale={0.6} autoRotate rotationSpeed={0.2} performanceMode={performanceMode} />
      <ShipModel shipClass="warship" position={[0, -2, 2]} scale={0.7} autoRotate rotationSpeed={0.4} performanceMode={performanceMode} />
      <ShipModel shipClass="explorer" position={[2, 2, -2]} scale={0.5} autoRotate rotationSpeed={0.25} performanceMode={performanceMode} />
    </>
  )
}
