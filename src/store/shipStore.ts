import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { shipStoreStorageKey } from './storageKeys'
import { createVersionedMigrate } from './stateMigration'

export type ShipStatus = 'docked' | 'in-flight' | 'maintenance'

export type OptimisticShipStatus = 'pending' | 'confirmed' | 'failed'

export interface ShipStats {
  speed: number
  scannerLevel: number
  shieldCapacity: number
  weaponPower: number
}

export interface Ship {
  id: string
  name: string
  model: string
  status: ShipStatus
  cargoCapacity: number
  crewCapacity: number
  lastKnownSector?: string
  stats?: ShipStats
  isPending?: boolean
}

export type ShipUpdateChanges = Partial<Omit<Ship, 'stats'>> & {
  stats?: Partial<ShipStats>
}

export interface OptimisticShipTransaction {
  id: string
  label: string
  shipId: string
  changes: ShipUpdateChanges
  before: Ship
  status: OptimisticShipStatus
  createdAt: string
  completedAt?: string
  error?: string
  transactionHash?: string
}

export interface ShipState {
  ships: Ship[]
  activeShipId: string | null
  optimisticTransactions: OptimisticShipTransaction[]
}

export interface ShipActions {
  setShips: (ships: Ship[]) => void
  upsertShip: (ship: Ship) => void
  removeShip: (shipId: string) => void
  setActiveShip: (shipId: string | null) => void
  updateShipStatus: (shipId: string, status: ShipStatus) => void
  updateShipStats: (shipId: string, stats: Partial<ShipStats>) => void
  applyOptimisticShipUpdate: (
    label: string,
    shipId: string,
    changes: ShipUpdateChanges,
    id?: string
  ) => string
  confirmOptimisticShipUpdate: (
    id: string,
    confirmedShip?: ShipUpdateChanges,
    transactionHash?: string
  ) => void
  rollbackOptimisticShipUpdate: (id: string, error?: string) => void
  isShipPending: (shipId?: string) => boolean
  getPendingShipTransaction: (shipId?: string) => OptimisticShipTransaction | undefined
  reconcileShipWithBlockchain: (shipId: string, confirmedData: ShipUpdateChanges) => void
  getActiveShip: () => Ship | null
  resetShips: () => void
}

export type ShipStore = ShipState & ShipActions

export { shipStoreStorageKey }

/** Bump whenever the shape of the persisted ShipState slice changes. */
export const SHIP_STORE_SCHEMA_VERSION = 1

export const initialShipState: ShipState = {
  ships: [],
  activeShipId: null,
  optimisticTransactions: [],
}

function createShipTxId(prefix = 'ship-tx'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useShipStore = create<ShipStore>()(
  persist(
    (set, get) => ({
      ...initialShipState,
      setShips: (ships) => set({ ships }),
      upsertShip: (ship) =>
        set((state) => {
          const existingIndex = state.ships.findIndex((item) => item.id === ship.id)

          if (existingIndex === -1) {
            return { ships: [...state.ships, ship] }
          }

          const ships = [...state.ships]
          ships[existingIndex] = ship
          return { ships }
        }),
      removeShip: (shipId) =>
        set((state) => ({
          ships: state.ships.filter((ship) => ship.id !== shipId),
          activeShipId: state.activeShipId === shipId ? null : state.activeShipId,
          optimisticTransactions: state.optimisticTransactions.filter((tx) => tx.shipId !== shipId),
        })),
      setActiveShip: (shipId) => set({ activeShipId: shipId }),
      updateShipStatus: (shipId, status) =>
        set((state) => ({
          ships: state.ships.map((ship) => (ship.id === shipId ? { ...ship, status } : ship)),
        })),
      updateShipStats: (shipId, stats) =>
        set((state) => ({
          ships: state.ships.map((ship) =>
            ship.id === shipId
              ? {
                  ...ship,
                  stats: {
                    ...(ship.stats ?? {
                      speed: 0,
                      scannerLevel: 0,
                      shieldCapacity: 0,
                      weaponPower: 0,
                    }),
                    ...stats,
                  },
                }
              : ship
          ),
        })),
      applyOptimisticShipUpdate: (label, shipId, changes, id = createShipTxId()) => {
        const state = get()
        const targetShip = state.ships.find((s) => s.id === shipId)
        if (!targetShip) {
          return id
        }

        const before: Ship = { ...targetShip }
        const updatedShip: Ship = {
          ...targetShip,
          ...changes,
          stats: changes.stats
            ? {
                ...(targetShip.stats ?? {
                  speed: 0,
                  scannerLevel: 0,
                  shieldCapacity: 0,
                  weaponPower: 0,
                }),
                ...changes.stats,
              }
            : targetShip.stats,
          isPending: true,
        }

        const transaction: OptimisticShipTransaction = {
          id,
          label,
          shipId,
          changes,
          before,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }

        set({
          ships: state.ships.map((s) => (s.id === shipId ? updatedShip : s)),
          optimisticTransactions: [transaction, ...state.optimisticTransactions],
        })

        return id
      },
      confirmOptimisticShipUpdate: (id, confirmedShip, transactionHash) =>
        set((state) => {
          const transaction = state.optimisticTransactions.find((tx) => tx.id === id)
          if (!transaction) return state

          const otherPendingForShip = state.optimisticTransactions.some(
            (tx) => tx.id !== id && tx.shipId === transaction.shipId && tx.status === 'pending'
          )

          const updatedShips: Ship[] = state.ships.map((ship) => {
            if (ship.id === transaction.shipId) {
              const mergedStats = confirmedShip?.stats
                ? {
                    ...(ship.stats ?? {
                      speed: 0,
                      scannerLevel: 0,
                      shieldCapacity: 0,
                      weaponPower: 0,
                    }),
                    ...confirmedShip.stats,
                  }
                : ship.stats

              return {
                ...ship,
                ...confirmedShip,
                stats: mergedStats,
                isPending: otherPendingForShip,
              }
            }
            return ship
          })

          const updatedTransactions = state.optimisticTransactions.map((tx) =>
            tx.id === id
              ? {
                  ...tx,
                  status: 'confirmed' as const,
                  completedAt: new Date().toISOString(),
                  transactionHash: transactionHash ?? tx.transactionHash,
                  error: undefined,
                }
              : tx
          )

          return {
            ships: updatedShips,
            optimisticTransactions: updatedTransactions,
          }
        }),
      rollbackOptimisticShipUpdate: (id, error) =>
        set((state) => {
          const transaction = state.optimisticTransactions.find((tx) => tx.id === id)
          if (!transaction || transaction.status !== 'pending') {
            return state
          }

          const otherPendingForShip = state.optimisticTransactions.some(
            (tx) => tx.id !== id && tx.shipId === transaction.shipId && tx.status === 'pending'
          )

          const updatedShips: Ship[] = state.ships.map((ship) => {
            if (ship.id === transaction.shipId) {
              return {
                ...transaction.before,
                isPending: otherPendingForShip,
              }
            }
            return ship
          })

          const updatedTransactions = state.optimisticTransactions.map((tx) =>
            tx.id === id
              ? {
                  ...tx,
                  status: 'failed' as const,
                  completedAt: new Date().toISOString(),
                  error,
                }
              : tx
          )

          return {
            ships: updatedShips,
            optimisticTransactions: updatedTransactions,
          }
        }),
      isShipPending: (shipId) => {
        const { optimisticTransactions } = get()
        if (shipId) {
          return optimisticTransactions.some(
            (tx) => tx.shipId === shipId && tx.status === 'pending'
          )
        }
        return optimisticTransactions.some((tx) => tx.status === 'pending')
      },
      getPendingShipTransaction: (shipId) => {
        const { optimisticTransactions } = get()
        if (shipId) {
          return optimisticTransactions.find(
            (tx) => tx.shipId === shipId && tx.status === 'pending'
          )
        }
        return optimisticTransactions.find((tx) => tx.status === 'pending')
      },
      reconcileShipWithBlockchain: (shipId, confirmedData) =>
        set((state) => ({
          ships: state.ships.map((ship): Ship => {
            if (ship.id !== shipId) return ship

            const mergedStats = confirmedData.stats
              ? {
                  ...(ship.stats ?? {
                    speed: 0,
                    scannerLevel: 0,
                    shieldCapacity: 0,
                    weaponPower: 0,
                  }),
                  ...confirmedData.stats,
                }
              : ship.stats

            return {
              ...ship,
              ...confirmedData,
              stats: mergedStats,
              isPending: state.optimisticTransactions.some(
                (tx) => tx.shipId === shipId && tx.status === 'pending'
              ),
            }
          }),
        })),
      getActiveShip: () => {
        const { ships, activeShipId } = get()
        return ships.find((s) => s.id === activeShipId) ?? null
      },
      resetShips: () => set(initialShipState),
    }),
    {
      name: shipStoreStorageKey,
      storage: createJSONStorage(() => localStorage),
      version: SHIP_STORE_SCHEMA_VERSION,
      partialize: ({ ships, activeShipId }) => ({ ships, activeShipId }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ShipState> | undefined
        return {
          ...current,
          ...persistedState,
          ships: Array.isArray(persistedState?.ships)
            ? persistedState!.ships.map((s) => ({ ...s, isPending: false }))
            : current.ships,
          activeShipId: persistedState?.activeShipId ?? current.activeShipId,
          optimisticTransactions: current.optimisticTransactions ?? [],
        }
      },
      migrate: createVersionedMigrate('shipStore', SHIP_STORE_SCHEMA_VERSION, (state) => {
        const persisted = state as Partial<ShipState> | undefined
        return {
          ...initialShipState,
          ...persisted,
          ships: Array.isArray(persisted?.ships)
            ? persisted!.ships.map((s) => ({ ...s, isPending: false }))
            : [],
          optimisticTransactions: [],
        }
      }),
    }
  )
)
