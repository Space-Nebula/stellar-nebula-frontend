import { DepthOfField } from '@react-three/postprocessing'
import { useMemo } from 'react'

interface DepthOfFieldEffectProps {
  enabled: boolean
  performanceMode?: boolean
}

export function DepthOfFieldEffect({ enabled, performanceMode = false }: DepthOfFieldEffectProps) {
  const adaptiveMode = performanceMode || window.matchMedia('(pointer: coarse)').matches

  if (!enabled) {
    return null
  }

  return (
    <DepthOfField
      focusDistance={10}
      radius={adaptiveMode ? 2 : 1}
      bokehScale={1}
      bokehSize={10}
      visibleRange={adaptiveMode ? [0.5, 20] : [0.3, 15]}
    />
  )
}
