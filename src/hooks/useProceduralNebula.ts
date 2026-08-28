import { useMemo } from 'react'
import {
  generateNebulaGeometry,
  type NebulaConfig,
  type NebulaGeometry,
} from '@/utils/procedural/nebula'

interface UseProceduralNebulaResult {
  geometry: NebulaGeometry | null
  isLoading: boolean
}

export function useProceduralNebula(config: NebulaConfig | null): UseProceduralNebulaResult {
  const seed = config?.seed
  const pattern = config?.pattern
  const particleCount = config?.particleCount
  const radius = config?.radius

  return useMemo(() => {
    if (!seed) {
      return { geometry: null, isLoading: false }
    }

    try {
      const geometry = generateNebulaGeometry({ seed, pattern, particleCount, radius })
      return { geometry, isLoading: false }
    } catch {
      return { geometry: null, isLoading: false }
    }
  }, [seed, pattern, particleCount, radius])
}
