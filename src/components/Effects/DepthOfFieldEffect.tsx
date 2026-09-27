import { DepthOfField, EffectComposer } from '@react-three/postprocessing'

interface DepthOfFieldEffectProps {
  enabled?: boolean
  performanceMode?: boolean
}

export function DepthOfFieldEffect({
  enabled = true,
  performanceMode = false,
}: DepthOfFieldEffectProps) {
  const adaptiveMode =
    performanceMode ||
    (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)

  if (!enabled) {
    return null
  }

  return (
    <EffectComposer multisampling={0}>
      <DepthOfField
        focusDistance={10}
        focalLength={adaptiveMode ? 0.05 : 0.02}
        bokehScale={adaptiveMode ? 2 : 1}
      />
    </EffectComposer>
  )
}
