import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRenderStatsStore } from '@/store/renderStatsStore'

/** How often to push renderer.info into the store — every frame would cause
 * a re-render of every subscriber on every frame, which is the opposite of
 * what a performance overlay should do. */
const UPDATE_INTERVAL_MS = 500

/**
 * Mounted inside `<Canvas>` to report `WebGLRenderer.info` (draw calls,
 * triangle count, live geometry/texture counts) to `renderStatsStore` for
 * display outside the canvas (`FpsCounter`, issue #322). Renders nothing.
 */
export function RenderStatsCollector() {
  const { gl } = useThree()
  const setRenderStats = useRenderStatsStore((s) => s.setRenderStats)
  const lastUpdateRef = useRef(0)

  useFrame((_, __, frame) => {
    void frame
    const now = performance.now()
    if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return
    lastUpdateRef.current = now

    const { render, memory } = gl.info
    setRenderStats({
      drawCalls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
    })
  })

  return null
}
