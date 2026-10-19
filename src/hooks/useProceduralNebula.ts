import { useEffect, useRef, useState } from 'react'
import {
  generateNebulaGeometry,
  type NebulaConfig,
  type NebulaGeometry,
} from '@/utils/procedural/nebula'
import { useWorker } from '@/hooks/useWorker'

interface UseProceduralNebulaResult {
  geometry: NebulaGeometry | null
  isLoading: boolean
}

function createNebulaWorker(): Worker {
  return new Worker(new URL('../workers/nebula-worker.ts', import.meta.url), {
    type: 'module',
  })
}

/**
 * Generates nebula particle geometry (up to 100 000 particles) via a Web
 * Worker instead of synchronously on the main thread, so a large nebula does
 * not freeze rendering or input handling with a long task while it is
 * computed (#383).
 *
 * Falls back to synchronous generation when Web Workers are unavailable
 * (older browsers, some SSR/test environments) or if the worker itself
 * rejects, so a nebula is still always produced.
 */
export function useProceduralNebula(config: NebulaConfig | null): UseProceduralNebulaResult {
  const seed = config?.seed
  const pattern = config?.pattern
  const particleCount = config?.particleCount
  const radius = config?.radius

  const { run, isSupported } = useWorker<NebulaConfig, NebulaGeometry>(createNebulaWorker)
  const [geometry, setGeometry] = useState<NebulaGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // Guards against a stale, slower request overwriting a newer one's result
  // if seed/pattern/particleCount/radius change again before it resolves.
  const latestRequestId = useRef(0)

  useEffect(() => {
    if (!seed) {
      setGeometry(null)
      setIsLoading(false)
      return
    }

    const requestId = ++latestRequestId.current
    const nebulaConfig: NebulaConfig = { seed, pattern, particleCount, radius }

    const generateSync = () => {
      try {
        setGeometry(generateNebulaGeometry(nebulaConfig))
      } catch {
        setGeometry(null)
      }
    }

    if (!isSupported) {
      generateSync()
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    run(nebulaConfig)
      .then((result) => {
        if (latestRequestId.current !== requestId) return
        setGeometry(result)
      })
      .catch(() => {
        if (latestRequestId.current !== requestId) return
        // Worker unavailable/failed for this request; still produce a result.
        generateSync()
      })
      .finally(() => {
        if (latestRequestId.current === requestId) {
          setIsLoading(false)
        }
      })
  }, [seed, pattern, particleCount, radius, run, isSupported])

  return { geometry, isLoading }
}
