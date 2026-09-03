import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

export interface LodConfig {
  /** Camera distance threshold for low detail */
  lowDetailDistance: number
  /** Camera distance threshold for medium detail */
  mediumDetailDistance: number
  /** Camera distance threshold for high detail */
  highDetailDistance: number
  /** Maximum particle count (close up) */
  maxParticles: number
  /** Minimum particle count (far away) */
  minParticles: number
}

export function useThreeJsLod({
  lowDetailDistance = 20,
  mediumDetailDistance = 10,
  highDetailDistance = 5,
  maxParticles = 15000,
  minParticles = 5000,
}: LodConfig) {
  const { camera } = useThree()
  const [particleCount, setParticleCount] = useState(minParticles)

  useFrame(() => {
    if (!camera) return

    const camPos = camera.position
    const nebulaPos = new Vector3(0, 0, 0)
    const distance = camPos.distanceTo(nebulaPos)

    let newCount: number
    if (distance < highDetailDistance) {
      newCount = maxParticles
    } else if (distance < mediumDetailDistance) {
      newCount = Math.max(minParticles, Math.round(maxParticles * 0.5))
    } else if (distance < lowDetailDistance) {
      newCount = Math.max(minParticles, Math.round(maxParticles * 0.25))
    } else {
      newCount = minParticles
    }

    setParticleCount(newCount)
  })

  return particleCount
}
