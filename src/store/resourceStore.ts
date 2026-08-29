import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { resourceStoreStorageKey } from './storageKeys'

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

/** Natural resources harvested from scanning nebula anomalies. */
export type HarvestableResourceType = 'nebulite' | 'stellarium' | 'voidcrystal' | 'darkMatter'

export interface HarvestEntry {
  id: string
  resourceType: HarvestableResourceType
  amount: number
  createdAt: string
}

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
  harvested: Record<HarvestableResourceType, number>
  harvestLog: HarvestEntry[]
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

export const HARVESTABLE_RESOURCE_TYPES: HarvestableResourceType[] = [
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
  harvested: {
    nebulite: 0,
    stellarium: 0,
    voidcrystal: 0,
    darkMatter: 0,
  },
  harvestLog: [],
  optimisticTransactions: [],
  harvestHistory: [],
  lastHarvest: null,
}

export function isResourceType(value: unknown): value is ResourceType {
  return typeof value === 'string' && (RESOURCE_TYPES as string[]).includes(value)
}

export function isHarvestableResourceType(value: unknown): value is HarvestableResourceType {
  return typeof value === 'string' && (HARVESTABLE_RESOURCE_TYPES as string[]).includes(value)
}

function createResourceEventId(prefix = 'resource-tx'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeAmount(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0))
}

function normalizeInventory(inventory: Partial<ResourceInventory> | undefined): ResourceInventory {
  return RESOURCE_TYPES.reduce<ResourceInventory>(
    (nextInventory, resource) => ({
      ...nextInventory,
      [resource]: normalizeAmount(inventory?.[resource]),
    }),
    { ...initialResourceState.inventory }
  )
}

function normalizeHarvested(
  harvested: Partial<Record<HarvestableResourceType, number>> | undefined
): Record<HarvestableResourceType, number> {
  return HARVESTABLE_RESOURCE_TYPES.reduce<Record<HarvestableResourceType, number>>(
    (totals, resourceType) => ({
      ...totals,
      [resourceType]: normalizeAmount(harvested?.[resourceType]),
    }),
    { ...initialResourceState.harvested }
  )
}

function normalizeHarvestLog(log: unknown): HarvestEntry[] {
  if (!Array.isArray(log)) return []

  return log
    .flatMap((entry) => {
      const candidate = entry as Partial<HarvestEntry>
      if (!candidate.id || !isHarvestableResourceType(candidate.resourceType)) return []

      return [
        {
          id: String(candidate.id),
          resourceType: candidate.resourceType,
          amount: normalizeAmount(candidate.amount),
          createdAt: candidate.createdAt ?? new Date().toISOString(),
        },
      ]
    })
    .slice(0, 50)
}

function normalizeHarvestHistory(history: unknown): HarvestedResourceEvent[] {
  if (!Array.isArray(history)) return []

  return history
    .flatMap((entry) => {
      const candidate = entry as Partial<HarvestedResourceEvent>
      if (!candidate.id || !candidate.scanPointId || !isResourceType(candidate.resourceType)) {
        return []
      }

      return [
        {
          id: String(candidate.id),
          scanPointId: String(candidate.scanPointId),
          resourceType: candidate.resourceType,
          amount: normalizeAmount(candidate.amount),
          source: candidate.source ?? 'scan',
          harvestedAt: candidate.harvestedAt ?? new Date().toISOString(),
          transactionHash: candidate.transactionHash,
        },
      ]
    })
    .slice(0, 50)
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

function createHarvestEntry(event: HarvestedResourceEvent): HarvestEntry | null {
  if (!isHarvestableResourceType(event.resourceType)) return null

  return {
    id: event.id,
    resourceType: event.resourceType,
    amount: event.amount,
    createdAt: event.harvestedAt,
  }
}

function applyHarvestEvent(
  state: ResourceState,
  event: HarvestedResourceEvent
): Pick<
  ResourceState,
  'inventory' | 'harvested' | 'harvestLog' | 'harvestHistory' | 'lastHarvest'
> {
  const harvestEntry = createHarvestEntry(event)
  const harvested = normalizeHarvested(state.harvested)

  if (harvestEntry) {
    harvested[harvestEntry.resourceType] += harvestEntry.amount
  }

  return {
    inventory: applyResourceChanges(state.inventory, {
      [event.resourceType]: event.amount,
    }),
    harvested,
    harvestLog: harvestEntry
      ? [harvestEntry, ...normalizeHarvestLog(state.harvestLog)].slice(0, 50)
      : state.harvestLog,
    harvestHistory: [event, ...normalizeHarvestHistory(state.harvestHistory)].slice(0, 50),
    lastHarvest: event,
  }
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
            [resource]: normalizeAmount(amount),
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
        const event: HarvestedResourceEvent = {
          id,
          scanPointId: input.scanPointId,
          resourceType: input.resourceType,
          amount: normalizeAmount(input.amount),
          source: input.source ?? (input.transactionHash ? 'contract' : 'scan'),
          harvestedAt: new Date().toISOString(),
          transactionHash: input.transactionHash,
        }

        set((state) => applyHarvestEvent(state, event))

        return event
      },
      addHarvest: (resourceType, amount) => {
        const now = new Date().toISOString()
        const event: HarvestedResourceEvent = {
          id: createResourceEventId('harvest'),
          scanPointId: 'nebula-scan',
          resourceType,
          amount: normalizeAmount(amount),
          source: 'scan',
          harvestedAt: now,
        }

        set((state) => applyHarvestEvent(state, event))
      },
      clearHarvestLog: () => set({ harvestLog: [] }),
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
      version: RESOURCE_STORE_SCHEMA_VERSION,
      partialize: ({ inventory, harvested, harvestLog, harvestHistory, lastHarvest }) => ({
        inventory,
        harvested,
        harvestLog,
        harvestHistory,
        lastHarvest,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ResourceState> | undefined

        return {
          ...current,
          ...persistedState,
          inventory: normalizeInventory(persistedState?.inventory),
          harvested: normalizeHarvested(persistedState?.harvested),
          harvestLog: normalizeHarvestLog(persistedState?.harvestLog),
          harvestHistory: normalizeHarvestHistory(persistedState?.harvestHistory),
          lastHarvest: persistedState?.lastHarvest ?? null,
          optimisticTransactions: current.optimisticTransactions,
        }
      },
    }
  )
)
