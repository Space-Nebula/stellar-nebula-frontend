import { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Mesh } from 'three'
import type { ResourceType, RarityTier } from '@/types/game'
import { getRarityColor, getRarityLabel } from '@/utils/rarity'
import * as THREE from 'three'

interface ScanPointData {
  id: string
  position: [number, number, number]
  resourceType: ResourceType
  resourceAmount: number
  color: string
  size: number
  rarity?: RarityTier
}

interface InteractiveScanPointProps {
  data: ScanPointData
  onScan?: (pointId: string, resourceType: ResourceType, amount: number) => void
  cooldown?: number
  remainingSeconds?: number
  isScanning?: boolean
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
  nebulite: '#67e8f9',
  stellarium: '#c084fc',
  voidcrystal: '#f0abfc',
  darkMatter: '#a78bfa',
}

export function InteractiveScanPoint({
  data,
  onScan,
  cooldown = 0,
  remainingSeconds = 0,
  isScanning = false,
}: InteractiveScanPointProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const handlePointerOver = useCallback(() => {
    if (cooldown <= 0 && !isScanning) {
      setHovered(true)
    }
  }, [cooldown, isScanning])

  const handlePointerOut = useCallback(() => {
    setHovered(false)
  }, [])

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()

      if (cooldown <= 0 && !isScanning && onScan) {
        onScan(data.id, data.resourceType, data.resourceAmount)
      }
    },
    [cooldown, isScanning, onScan, data]
  )

  // Pulse animation
  useFrame(() => {
    if (meshRef.current && !isScanning && cooldown <= 0) {
      const time = performance.now() * 0.001
      const pulse = 1 + Math.sin(time * 2) * 0.1
      const baseScale = hovered ? 1.3 : 1
      meshRef.current.scale.setScalar(baseScale * pulse)
    }
  })

  // Rotation animation
  useFrame((_state, delta: number) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
      meshRef.current.rotation.x += delta * 0.2
    }
  })

  const isOnCooldown = cooldown > 0
  const canInteract = !isOnCooldown && !isScanning
  const currentColor = isOnCooldown ? '#4b5563' : hovered ? '#ffffff' : data.color
  const emissiveIntensity = hovered ? 0.8 : isOnCooldown ? 0.1 : 0.5

  return (
    <mesh
      ref={meshRef}
      position={data.position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[data.size, 16, 16]} />
      <meshStandardMaterial
        color={currentColor}
        emissive={currentColor}
        emissiveIntensity={emissiveIntensity}
        toneMapped={false}
        transparent
        opacity={isOnCooldown ? 0.4 : 0.9}
      />

      {/* Glow effect when hovered */}
      {hovered && canInteract && (
        <mesh scale={1.5}>
          <sphereGeometry args={[data.size, 16, 16]} />
          <meshBasicMaterial color={currentColor} transparent opacity={0.2} toneMapped={false} />
        </mesh>
      )}

      {/* Cooldown ring */}
      {isOnCooldown && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[data.size * 1.2, data.size * 1.4, 32]} />
          <meshBasicMaterial color="#4b5563" transparent opacity={0.6} side={DoubleSide} />
        </mesh>
      )}

      {/* Countdown timer */}
      {isOnCooldown && remainingSeconds > 0 && (
        <Html position={[0, data.size * 2.5, 0]} center distanceFactor={8}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              color: '#f87171',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
              fontFamily: 'monospace',
            }}
          >
            {remainingSeconds}s
          </div>
        </Html>
      )}

      {/* Scanning indicator */}
      {isScanning && (
        <mesh scale={1.2}>
          <sphereGeometry args={[data.size, 16, 16]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      )}

      {/* Rarity badge */}
      {data.rarity && canInteract && !isScanning && (
        <Html position={[0, -data.size * 2.5, 0]} center distanceFactor={8}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              color: getRarityColor(data.rarity),
              fontSize: '9px',
              fontWeight: 700,
              padding: '1px 4px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {getRarityLabel(data.rarity)}
          </div>
        </Html>
      )}
    </mesh>
  )
}

interface ScanPointsProps {
  onScan?: (pointId: string, resourceType: ResourceType, amount: number) => void
  cooldowns?: Record<string, number>
  remainingSecondsMap?: Record<string, number>
  scanningPoints?: Set<string>
  rarityMap?: Record<string, RarityTier>
}

export function InteractiveScanPoints({
  onScan,
  cooldowns = {},
  remainingSecondsMap = {},
  scanningPoints = new Set(),
  rarityMap = {},
}: ScanPointsProps) {
  const scanPointsData: ScanPointData[] = [
    {
      id: 'scan-1',
      position: [2.2, 0.2, 0.4],
      resourceType: 'nebulite',
      resourceAmount: 50,
      color: RESOURCE_COLORS.nebulite,
      size: 0.06,
      rarity: rarityMap['scan-1'],
    },
    {
      id: 'scan-2',
      position: [-1.9, 0.8, -0.2],
      resourceType: 'stellarium',
      resourceAmount: 30,
      color: RESOURCE_COLORS.stellarium,
      size: 0.05,
      rarity: rarityMap['scan-2'],
    },
    {
      id: 'scan-3',
      position: [0.9, -1.8, 0.6],
      resourceType: 'voidcrystal',
      resourceAmount: 40,
      color: RESOURCE_COLORS.voidcrystal,
      size: 0.055,
      rarity: rarityMap['scan-3'],
    },
    {
      id: 'scan-4',
      position: [-0.7, 1.7, -0.5],
      resourceType: 'darkMatter',
      resourceAmount: 25,
      color: RESOURCE_COLORS.darkMatter,
      size: 0.045,
      rarity: rarityMap['scan-4'],
    },
  ]

  return (
    <group>
      {scanPointsData.map((point) => (
        <InteractiveScanPoint
          key={point.id}
          data={point}
          onScan={onScan}
          cooldown={cooldowns[point.id] || 0}
          remainingSeconds={remainingSecondsMap[point.id] || 0}
          isScanning={scanningPoints.has(point.id)}
        />
      ))}
    </group>
  )
}
