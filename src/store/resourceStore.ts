import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { resourceStoreStorageKey } from './storageKeys'

export type ResourceType = 'credits' | 'fuel' | 'minerals' | 'nebulaDust'

export type ResourceInventory = Record<ResourceType, number>

/** Natural resources harvested from scanning nebula anomalies. */
export type HarvestableResourceType = 'nebulite' | 'stellarium' | 'voidcrystal' | 'darkMatter'

export interface HarvestEntry {
  id: string
  resourceType: HarvestableResourceType
  amount: number
  createdAt: string
}

export type OptimisticResourceStatus = 'pending' | 'confirmed' | 'failed'

export interface OptimisticResourceTransaction {
  id: string
  label: string
  changes: Partial<Record<ResourceType, number>>
  before: ResourceInventory
  status: OptimisticResourceStatus
  createdAt: string
  completedAt?: string
  error?: string
}

export interface ResourceState {
  inventory: ResourceInventory
  harvested: Record<HarvestableResourceType, number>
  harvestLog: HarvestEntry[]
  optimisticTransactions: OptimisticResourceTransaction[]
}

export interface ResourceActions {
  setInventory: (inventory: ResourceInventory) => void
  setResource: (resource: ResourceType, amount: number) => void
  adjustResource: (resource: ResourceType, delta: number) => void
  addHarvest: (resourceType: HarvestableResourceType, amount: number) => void
  clearHarvestLog: () => void
  applyOptimisticUpdate: (
    label: string,
    changes: Partial<Record<ResourceType, number>>,
    id?: string
  ) => string
  confirmOptimisticUpdate: (id: string) => void
  rollbackOptimisticUpdate: (id: string, error?: string) => void
  canAfford: (resource: ResourceType, amount: number) => boolean
  resetResources: () => void
}

export type ResourceStore = ResourceState & ResourceActions

export { resourceStoreStorageKey }

/** Bump whenever the shape of the persisted ResourceState slice changes. */
export const RESOURCE_STORE_SCHEMA_VERSION = 1

export const initialResourceState: ResourceState = {
  inventory: {
    credits: 0,
    fuel: 0,
    minerals: 0,
    nebulaDust: 0,
  },
  harvested: {
    nebulite: 0,
    stellarium: 0,
    voidcrystal: 0,
    darkMatter: 0,
  },
  harvestLog: [],
  optimisticTransactions: [],
}

function createOptimisticId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `resource-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function applyResourceChanges(
  inventory: ResourceInventory,
  changes: Partial<Record<ResourceType, number>>
): ResourceInventory {
  return (Object.entries(changes) as Array<[ResourceType, number | undefined]>).reduce(
    (nextInventory, [resource, delta]) => {
      if (!delta) return nextInventory

      return {
        ...nextInventory,
        [resource]: Math.max(0, nextInventory[resource] + delta),
      }
    },
    inventory
  )
}

export const useResourceStore = create<ResourceStore>()(
  persist(
    (set, get) => ({
      ...initialResourceState,
      setInventory: (inventory) => set({ inventory }),
      setResource: (resource, amount) =>
        set((state) => ({
          inventory: {
            ...state.inventory,
            [resource]: Math.max(0, amount),
          },
        })),
      adjustResource: (resource, delta) =>
        set((state) => ({
          inventory: {
            ...state.inventory,
            [resource]: Math.max(0, state.inventory[resource] + delta),
          },
        })),
      addHarvest: (resourceType, amount) =>
        set((state) => ({
          harvested: {
            ...state.harvested,
            [resourceType]: state.harvested[resourceType] + amount,
          },
          harvestLog: [
            {
              id: createOptimisticId(),
              resourceType,
              amount,
              createdAt: new Date().toISOString(),
            },
            ...state.harvestLog,
          ].slice(0, 50),
        })),
      clearHarvestLog: () => set({ harvestLog: [] }),
      applyOptimisticUpdate: (label, changes, id = createOptimisticId()) => {
        set((state) => ({
          inventory: applyResourceChanges(state.inventory, changes),
          optimisticTransactions: [
            {
              id,
              label,
              changes,
              before: state.inventory,
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
            ...state.optimisticTransactions,
          ],
        }))

        return id
      },
      confirmOptimisticUpdate: (id) =>
        set((state) => ({
          optimisticTransactions: state.optimisticTransactions.map((transaction) =>
            transaction.id === id
              ? {
                  ...transaction,
                  status: 'confirmed',
                  completedAt: new Date().toISOString(),
                  error: undefined,
                }
              : transaction
          ),
        })),
      rollbackOptimisticUpdate: (id, error) =>
        set((state) => {
          const transaction = state.optimisticTransactions.find((item) => item.id === id)

          if (!transaction || transaction.status !== 'pending') {
            return state
          }

          return {
            inventory: applyResourceChanges(
              state.inventory,
              Object.fromEntries(
                Object.entries(transaction.changes).map(([resource, delta]) => [
                  resource,
                  -(delta ?? 0),
                ])
              ) as Partial<Record<ResourceType, number>>
            ),
            optimisticTransactions: state.optimisticTransactions.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: 'failed',
                    completedAt: new Date().toISOString(),
                    error,
                  }
                : item
            ),
          }
        }),
      canAfford: (resource, amount) => get().inventory[resource] >= amount,
      resetResources: () => set(initialResourceState),
    }),
    {
      name: resourceStoreStorageKey,
      storage: createJSONStorage(() => localStorage),
      version: RESOURCE_STORE_SCHEMA_VERSION,
      partialize: ({ inventory, harvested, harvestLog }) => ({ inventory, harvested, harvestLog }),
      migrate: (persistedState) => persistedState as ResourceState,
    }
  )
)
