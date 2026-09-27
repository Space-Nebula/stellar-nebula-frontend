import { create } from 'zustand'

/**
 * Three.js renderer statistics (draw calls, triangles, GPU resource counts),
 * read from `WebGLRenderer.info` by a collector mounted inside the R3F
 * `<Canvas>` (issue #322). Not persisted — this is live diagnostic state,
 * reset every time the canvas remounts.
 */
export interface RenderStats {
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  /** ms since epoch of the last update, or null before the collector runs. */
  updatedAt: number | null
}

export interface RenderStatsStore extends RenderStats {
  setRenderStats: (stats: Omit<RenderStats, 'updatedAt'>) => void
  reset: () => void
}

const initialStats: RenderStats = {
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  updatedAt: null,
}

export const useRenderStatsStore = create<RenderStatsStore>((set) => ({
  ...initialStats,
  setRenderStats: (stats) => set({ ...stats, updatedAt: Date.now() }),
  reset: () => set({ ...initialStats }),
}))
