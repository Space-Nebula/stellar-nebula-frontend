import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type GamePhase = 'loading' | 'menu' | 'playing' | 'paused' | 'gameover'

export interface ScanCooldown {
  nebulaId: string
  /** ISO-8601 timestamp when the cooldown expires */
  readyAt: string
}

export interface ActiveOperation {
  id: string
  type: 'scan' | 'mine' | 'travel'
  targetId: string
  startedAt: string // ISO-8601
}

export interface GameState {
  phase: GamePhase
  currentNebulaId: string | null
  activeOperation: ActiveOperation | null
  scanCooldowns: ScanCooldown[]
  elapsedSeconds: number
}

export interface GameActions {
  setPhase: (phase: GamePhase) => void
  enterNebula: (nebulaId: string) => void
  exitNebula: () => void
  startOperation: (operation: ActiveOperation) => void
  completeOperation: () => void
  /** Record a scan cooldown for nebulaId lasting cooldownMs (default 60 s). */
  addScanCooldown: (nebulaId: string, cooldownMs?: number) => void
  /** Remove expired cooldowns from the list. */
  pruneExpiredCooldowns: () => void
  isNebulaOnCooldown: (nebulaId: string) => boolean
  tickElapsed: (deltaSec: number) => void
  resetGame: () => void
}

export type GameStore = GameState & GameActions

export const gameStoreStorageKey = 'stellar-nebula:game-store'

const DEFAULT_SCAN_COOLDOWN_MS = 60_000

export const initialGameState: GameState = {
  phase: 'loading',
  currentNebulaId: null,
  activeOperation: null,
  scanCooldowns: [],
  elapsedSeconds: 0,
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState,

      setPhase: (phase) => set({ phase }),

      enterNebula: (nebulaId) =>
        set((state) => ({
          currentNebulaId: nebulaId,
          phase: state.phase === 'menu' ? 'playing' : state.phase,
        })),

      exitNebula: () =>
        set({
          currentNebulaId: null,
          activeOperation: null,
        }),

      startOperation: (operation) => set({ activeOperation: operation }),

      completeOperation: () => set({ activeOperation: null }),

      addScanCooldown: (nebulaId, cooldownMs = DEFAULT_SCAN_COOLDOWN_MS) =>
        set((state) => {
          const readyAt = new Date(Date.now() + cooldownMs).toISOString()
          const existing = state.scanCooldowns.findIndex((c) => c.nebulaId === nebulaId)
          if (existing === -1) {
            return { scanCooldowns: [...state.scanCooldowns, { nebulaId, readyAt }] }
          }
          const updated = [...state.scanCooldowns]
          updated[existing] = { nebulaId, readyAt }
          return { scanCooldowns: updated }
        }),

      pruneExpiredCooldowns: () =>
        set((state) => ({
          scanCooldowns: state.scanCooldowns.filter(
            (c) => Date.now() < new Date(c.readyAt).getTime(),
          ),
        })),

      isNebulaOnCooldown: (nebulaId) => {
        const { scanCooldowns } = get()
        const entry = scanCooldowns.find((c) => c.nebulaId === nebulaId)
        if (!entry) return false
        return Date.now() < new Date(entry.readyAt).getTime()
      },

      tickElapsed: (deltaSec) =>
        set((state) => ({ elapsedSeconds: state.elapsedSeconds + deltaSec })),

      resetGame: () => set(initialGameState),
    }),
    {
      name: gameStoreStorageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ phase, currentNebulaId, scanCooldowns, elapsedSeconds }) => ({
        phase,
        currentNebulaId,
        scanCooldowns,
        elapsedSeconds,
      }),
    },
  ),
)
