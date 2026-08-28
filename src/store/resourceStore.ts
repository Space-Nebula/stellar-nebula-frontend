import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ResourceType =
  | 'credits'
  | 'fuel'
  | 'minerals'
  | 'nebulaDust'
  | 'nebulite'
  | 'stellarium'
  | 'voidcrystal'
  | 'darkMatter'

export type ResourceInventory = Record<ResourceType, number>

export type OptimisticResourceStatus = 'pending' | 'confirmed' | 'failed'

export interface HarvestedResourceEvent {
  id: string
  scanPointId: string
  resourceType: ResourceType
  amount: number
  source: 'scan' | 'contract' | 'mock'
  harvestedAt: string
  transactionHash?: string
}

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
  optimisticTransactions: OptimisticResourceTransaction[]
  harvestHistory: HarvestedResourceEvent[]
  lastHarvest: HarvestedResourceEvent | null
}

export interface ResourceActions {
  setInventory: (inventory: ResourceInventory) => void
  setResource: (resource: ResourceType, amount: number) => void
  adjustResource: (resource: ResourceType, delta: number) => void
  harvestResource: (
    input: Omit<HarvestedResourceEvent, 'id' | 'harvestedAt' | 'source'> & {
      source?: HarvestedResourceEvent['source']
    },
    id?: string
  ) => HarvestedResourceEvent
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

export const resourceStoreStorageKey = 'stellar-nebula:resource-store'

export const RESOURCE_TYPES: ResourceType[] = [
  'credits',
  'fuel',
  'minerals',
  'nebulaDust',
  'nebulite',
  'stellarium',
  'voidcrystal',
  'darkMatter',
]

export const initialResourceState: ResourceState = {
  inventory: {
    credits: 0,
    fuel: 0,
    minerals: 0,
    nebulaDust: 0,
    nebulite: 0,
    stellarium: 0,
    voidcrystal: 0,
    darkMatter: 0,
  },
  optimisticTransactions: [],
  harvestHistory: [],
  lastHarvest: null,
}

function createResourceEventId(prefix = 'resource-tx'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeInventory(inventory: Partial<ResourceInventory> | undefined): ResourceInventory {
  return RESOURCE_TYPES.reduce<ResourceInventory>(
    (nextInventory, resource) => ({
      ...nextInventory,
      [resource]: Math.max(0, Number(inventory?.[resource] ?? 0)),
    }),
    { ...initialResourceState.inventory }
  )
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
        [resource]: Math.max(0, (nextInventory[resource] ?? 0) + delta),
      }
    },
    normalizeInventory(inventory)
  )
}

export const useResourceStore = create<ResourceStore>()(
  persist(
    (set, get) => ({
      ...initialResourceState,
      setInventory: (inventory) => set({ inventory: normalizeInventory(inventory) }),
      setResource: (resource, amount) =>
        set((state) => ({
          inventory: {
            ...normalizeInventory(state.inventory),
            [resource]: Math.max(0, amount),
          },
        })),
      adjustResource: (resource, delta) =>
        set((state) => ({
          inventory: {
            ...normalizeInventory(state.inventory),
            [resource]: Math.max(0, (state.inventory[resource] ?? 0) + delta),
          },
        })),
      harvestResource: (input, id = createResourceEventId('harvest')) => {
        const amount = Math.max(0, Math.floor(input.amount))
        const event: HarvestedResourceEvent = {
          id,
          scanPointId: input.scanPointId,
          resourceType: input.resourceType,
          amount,
          source: input.source ?? (input.transactionHash ? 'contract' : 'scan'),
          harvestedAt: new Date().toISOString(),
          transactionHash: input.transactionHash,
        }

        set((state) => ({
          inventory: applyResourceChanges(state.inventory, {
            [event.resourceType]: event.amount,
          }),
          harvestHistory: [event, ...state.harvestHistory].slice(0, 50),
          lastHarvest: event,
        }))

        return event
      },
      applyOptimisticUpdate: (label, changes, id = createResourceEventId()) => {
        set((state) => ({
          inventory: applyResourceChanges(state.inventory, changes),
          optimisticTransactions: [
            {
              id,
              label,
              changes,
              before: normalizeInventory(state.inventory),
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
      canAfford: (resource, amount) => (get().inventory[resource] ?? 0) >= amount,
      resetResources: () => set(initialResourceState),
    }),
    {
      name: resourceStoreStorageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ inventory, harvestHistory, lastHarvest }) => ({
        inventory,
        harvestHistory,
        lastHarvest,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ResourceState> | undefined

        return {
          ...current,
          ...persistedState,
          inventory: normalizeInventory(persistedState?.inventory),
          harvestHistory: persistedState?.harvestHistory ?? [],
          lastHarvest: persistedState?.lastHarvest ?? null,
        }
      },
    }
  )
)
