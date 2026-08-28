import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Achievement } from '@/components/Achievements/types'
import type { ResourceInventory, ResourceType } from './resourceStore'

export type GameEventType =
  | 'scan_completed'
  | 'ship_upgraded'
  | 'achievement_unlocked'
  | 'share_created'

export interface GameEvent {
  id: string
  type: GameEventType
  createdAt: string
  payload: Record<string, string | number | boolean | null | undefined>
}

export interface AchievementStats {
  scansCompleted: number
  resourcesCollected: number
  resourcesByType: ResourceInventory
  shipsUpgraded: number
  sharesCreated: number
}

export interface AchievementDefinition extends Pick<
  Achievement,
  'id' | 'title' | 'description' | 'icon' | 'target' | 'rarity'
> {
  condition: string
  progress: (stats: AchievementStats) => number
}

export interface AchievementState {
  stats: AchievementStats
  unlockedAtById: Record<string, string>
  eventLog: GameEvent[]
  pendingNotifications: Achievement[]
}

export interface AchievementActions {
  recordScanCompleted: (input: {
    pointId: string
    resourceType: ResourceType
    amount: number
    transactionHash?: string
  }) => Achievement[]
  recordUpgradeCompleted: (input: { upgradeId: string; shipId: string }) => Achievement[]
  recordShareCreated: (input: { channel: string; subject: string }) => Achievement[]
  dismissAchievementNotification: (achievementId: string) => void
  getAchievements: () => Achievement[]
  resetAchievements: () => void
}

export type AchievementStore = AchievementState & AchievementActions

export const achievementStoreStorageKey = 'stellar-nebula:achievement-store'

const emptyResourceTotals: ResourceInventory = {
  credits: 0,
  fuel: 0,
  minerals: 0,
  nebulaDust: 0,
  nebulite: 0,
  stellarium: 0,
  voidcrystal: 0,
  darkMatter: 0,
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first-scan',
    title: 'First Scan',
    description: 'Complete one nebula scan.',
    icon: 'SCAN',
    target: 1,
    rarity: 'common',
    condition: 'Unlocks when scansCompleted >= 1.',
    progress: (stats) => stats.scansCompleted,
  },
  {
    id: 'sector-surveyor',
    title: 'Sector Surveyor',
    description: 'Complete 10 nebula scans.',
    icon: 'SURV',
    target: 10,
    rarity: 'rare',
    condition: 'Unlocks when scansCompleted >= 10.',
    progress: (stats) => stats.scansCompleted,
  },
  {
    id: 'first-harvest',
    title: 'First Harvest',
    description: 'Harvest any resource from a scan.',
    icon: 'HRV',
    target: 1,
    rarity: 'common',
    condition: 'Unlocks when resourcesCollected >= 1.',
    progress: (stats) => stats.resourcesCollected,
  },
  {
    id: 'resource-hauler',
    title: 'Resource Hauler',
    description: 'Collect 500 total resource units.',
    icon: 'HAUL',
    target: 500,
    rarity: 'epic',
    condition: 'Unlocks when resourcesCollected >= 500.',
    progress: (stats) => stats.resourcesCollected,
  },
  {
    id: 'dark-matter-trace',
    title: 'Dark Matter Trace',
    description: 'Harvest 25 dark matter units.',
    icon: 'DARK',
    target: 25,
    rarity: 'legendary',
    condition: 'Unlocks when resourcesByType.darkMatter >= 25.',
    progress: (stats) => stats.resourcesByType.darkMatter,
  },
  {
    id: 'first-upgrade',
    title: 'First Upgrade',
    description: 'Complete one ship upgrade.',
    icon: 'UP',
    target: 1,
    rarity: 'rare',
    condition: 'Unlocks when shipsUpgraded >= 1.',
    progress: (stats) => stats.shipsUpgraded,
  },
  {
    id: 'fleet-engineer',
    title: 'Fleet Engineer',
    description: 'Complete three ship upgrades.',
    icon: 'ENG',
    target: 3,
    rarity: 'epic',
    condition: 'Unlocks when shipsUpgraded >= 3.',
    progress: (stats) => stats.shipsUpgraded,
  },
  {
    id: 'signal-boost',
    title: 'Signal Boost',
    description: 'Share an achievement, scan, or leaderboard result.',
    icon: 'SHR',
    target: 1,
    rarity: 'common',
    condition: 'Unlocks when sharesCreated >= 1.',
    progress: (stats) => stats.sharesCreated,
  },
]

export const initialAchievementState: AchievementState = {
  stats: {
    scansCompleted: 0,
    resourcesCollected: 0,
    resourcesByType: emptyResourceTotals,
    shipsUpgraded: 0,
    sharesCreated: 0,
  },
  unlockedAtById: {},
  eventLog: [],
  pendingNotifications: [],
}

function createEventId(prefix = 'game-event'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeStats(stats?: Partial<AchievementStats>): AchievementStats {
  return {
    scansCompleted: Math.max(0, Number(stats?.scansCompleted ?? 0)),
    resourcesCollected: Math.max(0, Number(stats?.resourcesCollected ?? 0)),
    resourcesByType: {
      ...emptyResourceTotals,
      ...(stats?.resourcesByType ?? {}),
    },
    shipsUpgraded: Math.max(0, Number(stats?.shipsUpgraded ?? 0)),
    sharesCreated: Math.max(0, Number(stats?.sharesCreated ?? 0)),
  }
}

export function buildAchievements(
  stats: AchievementStats,
  unlockedAtById: Record<string, string>
): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const progress = Math.min(definition.target, Math.max(0, definition.progress(stats)))
    const unlockedAt = unlockedAtById[definition.id]

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      progress,
      target: definition.target,
      unlocked: Boolean(unlockedAt),
      rarity: definition.rarity,
      unlockedAt,
    }
  })
}

function evaluateUnlocks(
  stats: AchievementStats,
  unlockedAtById: Record<string, string>,
  unlockedAt: string
): { unlockedAtById: Record<string, string>; newlyUnlocked: Achievement[] } {
  const nextUnlocked = { ...unlockedAtById }
  const newlyUnlocked: Achievement[] = []

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (nextUnlocked[definition.id]) continue
    if (definition.progress(stats) < definition.target) continue

    nextUnlocked[definition.id] = unlockedAt
    newlyUnlocked.push(
      buildAchievements(stats, { ...nextUnlocked, [definition.id]: unlockedAt }).find(
        (achievement) => achievement.id === definition.id
      ) as Achievement
    )
  }

  return { unlockedAtById: nextUnlocked, newlyUnlocked }
}

function appendGameEvent(
  state: AchievementState,
  event: Omit<GameEvent, 'id' | 'createdAt'>
): Pick<AchievementState, 'eventLog'> {
  return {
    eventLog: [
      {
        ...event,
        id: createEventId(),
        createdAt: new Date().toISOString(),
      },
      ...state.eventLog,
    ].slice(0, 100),
  }
}

export const useAchievementStore = create<AchievementStore>()(
  persist(
    (set, get) => ({
      ...initialAchievementState,
      recordScanCompleted: (input) => {
        let unlocked: Achievement[] = []

        set((state) => {
          const nextStats = normalizeStats({
            ...state.stats,
            scansCompleted: state.stats.scansCompleted + 1,
            resourcesCollected: state.stats.resourcesCollected + Math.max(0, input.amount),
            resourcesByType: {
              ...state.stats.resourcesByType,
              [input.resourceType]:
                (state.stats.resourcesByType[input.resourceType] ?? 0) + Math.max(0, input.amount),
            },
          })
          const result = evaluateUnlocks(nextStats, state.unlockedAtById, new Date().toISOString())
          unlocked = result.newlyUnlocked

          return {
            stats: nextStats,
            unlockedAtById: result.unlockedAtById,
            pendingNotifications: [...state.pendingNotifications, ...unlocked],
            ...appendGameEvent(state, {
              type: 'scan_completed',
              payload: {
                pointId: input.pointId,
                resourceType: input.resourceType,
                amount: input.amount,
                transactionHash: input.transactionHash,
              },
            }),
          }
        })

        return unlocked
      },
      recordUpgradeCompleted: (input) => {
        let unlocked: Achievement[] = []

        set((state) => {
          const nextStats = normalizeStats({
            ...state.stats,
            shipsUpgraded: state.stats.shipsUpgraded + 1,
          })
          const result = evaluateUnlocks(nextStats, state.unlockedAtById, new Date().toISOString())
          unlocked = result.newlyUnlocked

          return {
            stats: nextStats,
            unlockedAtById: result.unlockedAtById,
            pendingNotifications: [...state.pendingNotifications, ...unlocked],
            ...appendGameEvent(state, {
              type: 'ship_upgraded',
              payload: input,
            }),
          }
        })

        return unlocked
      },
      recordShareCreated: (input) => {
        let unlocked: Achievement[] = []

        set((state) => {
          const nextStats = normalizeStats({
            ...state.stats,
            sharesCreated: state.stats.sharesCreated + 1,
          })
          const result = evaluateUnlocks(nextStats, state.unlockedAtById, new Date().toISOString())
          unlocked = result.newlyUnlocked

          return {
            stats: nextStats,
            unlockedAtById: result.unlockedAtById,
            pendingNotifications: [...state.pendingNotifications, ...unlocked],
            ...appendGameEvent(state, {
              type: 'share_created',
              payload: input,
            }),
          }
        })

        return unlocked
      },
      dismissAchievementNotification: (achievementId) =>
        set((state) => ({
          pendingNotifications: state.pendingNotifications.filter(
            (achievement) => achievement.id !== achievementId
          ),
        })),
      getAchievements: () => buildAchievements(get().stats, get().unlockedAtById),
      resetAchievements: () => set(initialAchievementState),
    }),
    {
      name: achievementStoreStorageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ stats, unlockedAtById, eventLog }) => ({
        stats,
        unlockedAtById,
        eventLog,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<AchievementState> | undefined

        return {
          ...current,
          ...persistedState,
          stats: normalizeStats(persistedState?.stats),
          unlockedAtById: persistedState?.unlockedAtById ?? {},
          eventLog: persistedState?.eventLog ?? [],
          pendingNotifications: [],
        }
      },
    }
  )
)
