import { useEffect, useState } from 'react'

export function useWebGlSupport() {
  const [isWebGlSupported, setIsWebGlSupported] = useState<boolean | null>(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const names = ['webgl2', 'webgl', 'experimental-webgl']
    const context = names.reduce((acc, name) => {
      if (acc) return acc
      try {
        return canvas.getContext(name)
      } catch (e) {
        return null
      }
    }, null as any)

    setIsWebGlSupported(!!context)

    if (!context) {
      console.error('WebGL is not supported on this device')
    }
  }, [])

  return isWebGlSupported
}
