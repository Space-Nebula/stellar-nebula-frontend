import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'
import { gameStoreStorageKey } from './storageKeys'
import { createVersionedMigrate } from './stateMigration'

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

export type OptimisticOperationStatus = 'pending' | 'confirmed' | 'failed'

export interface OptimisticGameOperation {
  id: string
  label: string
  operation: ActiveOperation
  status: OptimisticOperationStatus
  createdAt: string
  completedAt?: string
  error?: string
}

export interface GameState {
  phase: GamePhase
  currentNebulaId: string | null
  activeOperation: ActiveOperation | null
  scanCooldowns: ScanCooldown[]
  elapsedSeconds: number
  optimisticOperations: OptimisticGameOperation[]
  lockedOperations: Record<string, boolean>
  operationQueue: ActiveOperation[]
  pendingState: boolean
}

export interface GameActions {
  setPhase: (phase: GamePhase) => void
  enterNebula: (nebulaId: string) => void
  exitNebula: () => void
  startOperation: (operation: ActiveOperation) => void
  completeOperation: () => void
  /** Attempt to lock an operation type to prevent race conditions. */
  acquireLock: (type: string) => boolean
  /** Release an operation lock and process next queued operation if available. */
  releaseLock: (type: string) => void
  /** Queue an operation if type is locked or execute immediately if available. */
  queueOperation: (operation: ActiveOperation) => { queued: boolean; position: number }
  /** Start operation with strict atomic locking and conflict handling. */
  startOperationWithLock: (operation: ActiveOperation) => { success: boolean; reason?: string }
  /** Complete current active operation and process queued operations. */
  completeOperationWithLock: () => ActiveOperation | null
  /** Check if operation type has active lock / conflict. */
  hasOperationConflict: (type: string) => boolean
  startOptimisticOperation: (
    operation: ActiveOperation,
    label?: string,
    cooldownMs?: number
  ) => string
  confirmOperation: (operationId: string) => void
  rollbackOperation: (operationId: string, error?: string, removeCooldownNebulaId?: string) => void
  isOperationPending: (operationId?: string) => boolean
  /** Record a scan cooldown for nebulaId lasting cooldownMs (default 60 s). */
  addScanCooldown: (nebulaId: string, cooldownMs?: number) => void
  /** Remove a scan cooldown for a specific nebulaId (e.g. on rollback). */
  removeScanCooldown: (nebulaId: string) => void
  /** Remove expired cooldowns from the list. */
  pruneExpiredCooldowns: () => void
  isNebulaOnCooldown: (nebulaId: string) => boolean
  tickElapsed: (deltaSec: number) => void
  resetGame: () => void
}

export type GameStore = GameState & GameActions

export { gameStoreStorageKey }

const DEFAULT_SCAN_COOLDOWN_MS = 60_000

/** Bump whenever the shape of the persisted GameState slice changes. */
export const GAME_STORE_SCHEMA_VERSION = 2

export const initialGameState: GameState = {
  phase: 'loading',
  currentNebulaId: null,
  activeOperation: null,
  scanCooldowns: [],
  elapsedSeconds: 0,
  optimisticOperations: [],
  lockedOperations: {},
  operationQueue: [],
  pendingState: false,
}

function createOpId(prefix = 'op'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const isDev =
  typeof import.meta !== 'undefined' &&
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV !== false

export const useGameStore = create<GameStore>()(
  devtools(
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
            lockedOperations: {},
            operationQueue: [],
            pendingState: false,
          }),

        startOperation: (operation) => {
          const result = get().startOperationWithLock(operation)
          if (!result.success) {
            get().queueOperation(operation)
          }
        },

        completeOperation: () => {
          get().completeOperationWithLock()
        },

        acquireLock: (type) => {
          const { lockedOperations } = get()
          if (lockedOperations[type]) return false
          set({
            lockedOperations: { ...lockedOperations, [type]: true },
            pendingState: true,
          })
          return true
        },

        releaseLock: (type) => {
          const { lockedOperations, operationQueue } = get()
          const updatedLocks = { ...lockedOperations }
          delete updatedLocks[type]

          const anyRemainingLocks = Object.keys(updatedLocks).length > 0
          set({
            lockedOperations: updatedLocks,
            pendingState: anyRemainingLocks,
          })

          // Check if queue has a pending operation for this type
          const nextIndex = operationQueue.findIndex((op) => op.type === type)
          if (nextIndex !== -1) {
            const nextOp = operationQueue[nextIndex]
            const remainingQueue = [...operationQueue]
            remainingQueue.splice(nextIndex, 1)
            set({ operationQueue: remainingQueue })
            get().startOperationWithLock(nextOp)
          }
        },

        queueOperation: (operation) => {
          const { operationQueue, lockedOperations } = get()
          if (!lockedOperations[operation.type]) {
            const success = get().acquireLock(operation.type)
            if (success) {
              set({ activeOperation: operation })
              return { queued: false, position: 0 }
            }
          }

          const updatedQueue = [...operationQueue, operation]
          set({ operationQueue: updatedQueue })
          return { queued: true, position: updatedQueue.length }
        },

        startOperationWithLock: (operation) => {
          const { lockedOperations, activeOperation } = get()

          if (
            lockedOperations[operation.type] ||
            (activeOperation && activeOperation.type === operation.type)
          ) {
            return {
              success: false,
              reason: `Conflict: Operation of type "${operation.type}" is already in progress`,
            }
          }

          set({
            lockedOperations: { ...lockedOperations, [operation.type]: true },
            activeOperation: operation,
            pendingState: true,
          })
          return { success: true }
        },

        completeOperationWithLock: () => {
          const { activeOperation, lockedOperations } = get()
          if (!activeOperation) return null
          const type = activeOperation.type
          const updated = { ...lockedOperations }
          delete updated[type]
          set({
            activeOperation: null,
            lockedOperations: updated,
            pendingState: Object.keys(updated).length > 0,
          })
          const queue = get().operationQueue
          const next = queue.find((op) => op.type === type)
          if (next) {
            const remaining = queue.filter((op) => op.id !== next.id)
            set({ operationQueue: remaining })
            get().startOperationWithLock(next)
          }
          return activeOperation
        },

        hasOperationConflict: (type) => {
          const { lockedOperations, activeOperation } = get()
          return Boolean(
            lockedOperations[type] || (activeOperation && activeOperation.type === type)
          )
        },

        startOptimisticOperation: (
          operation,
          label = `Operation: ${operation.type}`,
          cooldownMs = DEFAULT_SCAN_COOLDOWN_MS
        ) => {
          const id = operation.id || createOpId()
          const opWithId = { ...operation, id }

          set((state) => {
            let updatedCooldowns = state.scanCooldowns
            if (operation.type === 'scan' && operation.targetId) {
              const readyAt = new Date(Date.now() + cooldownMs).toISOString()
              const existing = state.scanCooldowns.findIndex(
                (c) => c.nebulaId === operation.targetId
              )
              if (existing === -1) {
                updatedCooldowns = [
                  ...state.scanCooldowns,
                  { nebulaId: operation.targetId, readyAt },
                ]
              } else {
                const copy = [...state.scanCooldowns]
                copy[existing] = { nebulaId: operation.targetId, readyAt }
                updatedCooldowns = copy
              }
            }

            const optimisticOp: OptimisticGameOperation = {
              id,
              label,
              operation: opWithId,
              status: 'pending',
              createdAt: new Date().toISOString(),
            }

            return {
              activeOperation: opWithId,
              scanCooldowns: updatedCooldowns,
              optimisticOperations: [optimisticOp, ...state.optimisticOperations],
            }
          })

          return id
        },

        confirmOperation: (operationId) =>
          set((state) => ({
            activeOperation:
              state.activeOperation?.id === operationId ? null : state.activeOperation,
            optimisticOperations: state.optimisticOperations.map((op) =>
              op.id === operationId
                ? {
                    ...op,
                    status: 'confirmed' as const,
                    completedAt: new Date().toISOString(),
                  }
                : op
            ),
          })),

        rollbackOperation: (operationId, error, removeCooldownNebulaId) =>
          set((state) => {
            let updatedCooldowns = state.scanCooldowns
            const targetOp = state.optimisticOperations.find((op) => op.id === operationId)
            const targetNebulaId = removeCooldownNebulaId ?? targetOp?.operation.targetId

            if (targetNebulaId) {
              updatedCooldowns = state.scanCooldowns.filter((c) => c.nebulaId !== targetNebulaId)
            }

            return {
              activeOperation:
                state.activeOperation?.id === operationId ? null : state.activeOperation,
              scanCooldowns: updatedCooldowns,
              optimisticOperations: state.optimisticOperations.map((op) =>
                op.id === operationId
                  ? {
                      ...op,
                      status: 'failed' as const,
                      completedAt: new Date().toISOString(),
                      error,
                    }
                  : op
              ),
            }
          }),

        isOperationPending: (operationId) => {
          const { optimisticOperations } = get()
          if (operationId) {
            return optimisticOperations.some(
              (op) => op.id === operationId && op.status === 'pending'
            )
          }
          return optimisticOperations.some((op) => op.status === 'pending')
        },

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

        removeScanCooldown: (nebulaId) =>
          set((state) => ({
            scanCooldowns: state.scanCooldowns.filter((c) => c.nebulaId !== nebulaId),
          })),

        pruneExpiredCooldowns: () =>
          set((state) => ({
            scanCooldowns: state.scanCooldowns.filter(
              (c) => Date.now() < new Date(c.readyAt).getTime()
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
        version: GAME_STORE_SCHEMA_VERSION,
        partialize: ({ phase, currentNebulaId, scanCooldowns, elapsedSeconds }) => ({
          phase,
          currentNebulaId,
          scanCooldowns,
          elapsedSeconds,
        }),
        merge: (persisted, current) => {
          const persistedState = persisted as Partial<GameState> | undefined
          return {
            ...current,
            ...persistedState,
            activeOperation: null,
            optimisticOperations: current.optimisticOperations ?? [],
          }
        },
      }
    ),
    { enabled: isDev }
  )
)
