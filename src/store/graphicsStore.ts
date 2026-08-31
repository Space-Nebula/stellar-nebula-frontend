import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { graphicsStoreStorageKey } from './storageKeys'
import { createVersionedMigrate } from './stateMigration'

export type ZoomLevel = 'overview' | 'exploration' | 'detail'

export interface GraphicsState {
  bloomEnabled: boolean
  bloomIntensity: number
  performanceMode: boolean
  starfieldDensity: number
  zoomLevel: ZoomLevel
  /** Whether the camera slowly auto-rotates around the scene when idle. */
  autoRotateEnabled: boolean
}

export interface GraphicsActions {
  setBloomEnabled: (enabled: boolean) => void
  setBloomIntensity: (intensity: number) => void
  setPerformanceMode: (enabled: boolean) => void
  setStarfieldDensity: (density: number) => void
  setZoomLevel: (level: ZoomLevel) => void
  setAutoRotateEnabled: (enabled: boolean) => void
}

export type GraphicsStore = GraphicsState & GraphicsActions

export { graphicsStoreStorageKey }

/** Bump whenever the shape of the persisted GraphicsState slice changes. */
export const GRAPHICS_STORE_SCHEMA_VERSION = 1

export const initialGraphicsState: GraphicsState = {
  bloomEnabled: true,
  bloomIntensity: 0.55,
  performanceMode: false,
  starfieldDensity: 0.85,
  zoomLevel: 'exploration',
  autoRotateEnabled: true,
}

const clampBloomIntensity = (value: number) => Math.min(1.2, Math.max(0, value))
const clampStarfieldDensity = (value: number) => Math.min(1.5, Math.max(0.4, value))

export const useGraphicsStore = create<GraphicsStore>()(
  persist(
    (set) => ({
      ...initialGraphicsState,
      setBloomEnabled: (bloomEnabled) => set({ bloomEnabled }),
      setBloomIntensity: (bloomIntensity) =>
        set({ bloomIntensity: clampBloomIntensity(bloomIntensity) }),
      setPerformanceMode: (performanceMode) => set({ performanceMode }),
      setStarfieldDensity: (starfieldDensity) =>
        set({ starfieldDensity: clampStarfieldDensity(starfieldDensity) }),
      setZoomLevel: (zoomLevel) => set({ zoomLevel }),
      setAutoRotateEnabled: (autoRotateEnabled) => set({ autoRotateEnabled }),
    }),
    {
      name: graphicsStoreStorageKey,
      storage: createJSONStorage(() => localStorage),
      version: GRAPHICS_STORE_SCHEMA_VERSION,
      partialize: ({
        bloomEnabled,
        bloomIntensity,
        performanceMode,
        starfieldDensity,
        autoRotateEnabled,
      }) => ({
        bloomEnabled,
        bloomIntensity,
        performanceMode,
        starfieldDensity,
        autoRotateEnabled,
      }),
      migrate: createVersionedMigrate('graphicsStore', GRAPHICS_STORE_SCHEMA_VERSION, (state) => ({
        ...initialGraphicsState,
        ...(state as Partial<GraphicsState>),
      })),
    }
  )
)
