import type { AchievementStats } from '@/store'

export interface LeaderboardPlayerSnapshot {
  playerId: string
  walletAddress: string
  scansCompleted: number
  resourcesCollected: number
  shipsUpgraded: number
  achievementsUnlocked: number
  updatedAt: string
}

export interface LeaderboardEntry extends LeaderboardPlayerSnapshot {
  rank: number
  score: number
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[]
  total: number
  page: number
  pageSize: number
  source: 'backend' | 'local'
  rankingAlgorithm: string
}

export interface LeaderboardCurrentUser {
  walletAddress: string
  stats: AchievementStats
  achievementsUnlocked: number
}

export interface FetchLeaderboardOptions {
  page: number
  pageSize: number
  currentUser?: LeaderboardCurrentUser | null
  signal?: AbortSignal
}

export const LEADERBOARD_RANKING_ALGORITHM =
  'score = resourcesCollected + scansCompleted * 75 + shipsUpgraded * 1500 + achievementsUnlocked * 750'

const RANKING_WEIGHTS = {
  scan: 75,
  shipUpgrade: 1500,
  achievement: 750,
} as const

const SEEDED_RIVALS: LeaderboardPlayerSnapshot[] = [
  {
    playerId: 'orion-crew',
    walletAddress: 'GORION...CREW',
    scansCompleted: 44,
    resourcesCollected: 5200,
    shipsUpgraded: 3,
    achievementsUnlocked: 6,
    updatedAt: '2026-08-20T10:00:00.000Z',
  },
  {
    playerId: 'pulsar-miner',
    walletAddress: 'GPULS...MINE',
    scansCompleted: 31,
    resourcesCollected: 4100,
    shipsUpgraded: 2,
    achievementsUnlocked: 4,
    updatedAt: '2026-08-20T10:00:00.000Z',
  },
  {
    playerId: 'drift-captain',
    walletAddress: 'GDRFT...CAPT',
    scansCompleted: 18,
    resourcesCollected: 2300,
    shipsUpgraded: 1,
    achievementsUnlocked: 3,
    updatedAt: '2026-08-20T10:00:00.000Z',
  },
  {
    playerId: 'silent-array',
    walletAddress: 'GSILT...ARRY',
    scansCompleted: 9,
    resourcesCollected: 980,
    shipsUpgraded: 1,
    achievementsUnlocked: 2,
    updatedAt: '2026-08-20T10:00:00.000Z',
  },
]

function asNumber(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}

function normalizeSnapshot(input: unknown): LeaderboardPlayerSnapshot | null {
  if (!input || typeof input !== 'object') return null

  const source = input as Record<string, unknown>
  const walletAddress =
    typeof source.walletAddress === 'string'
      ? source.walletAddress
      : typeof source.wallet_address === 'string'
        ? source.wallet_address
        : null

  if (!walletAddress) return null

  return {
    playerId:
      typeof source.playerId === 'string'
        ? source.playerId
        : typeof source.player_id === 'string'
          ? source.player_id
          : walletAddress,
    walletAddress,
    scansCompleted: asNumber(source.scansCompleted ?? source.scans_completed),
    resourcesCollected: asNumber(source.resourcesCollected ?? source.resources_collected),
    shipsUpgraded: asNumber(source.shipsUpgraded ?? source.ships_upgraded),
    achievementsUnlocked: asNumber(source.achievementsUnlocked ?? source.achievements_unlocked),
    updatedAt:
      typeof source.updatedAt === 'string'
        ? source.updatedAt
        : typeof source.updated_at === 'string'
          ? source.updated_at
          : new Date().toISOString(),
  }
}

function currentUserSnapshot(
  currentUser?: LeaderboardCurrentUser | null
): LeaderboardPlayerSnapshot | null {
  if (!currentUser?.walletAddress) return null

  return {
    playerId: 'you',
    walletAddress: currentUser.walletAddress,
    scansCompleted: currentUser.stats.scansCompleted,
    resourcesCollected: currentUser.stats.resourcesCollected,
    shipsUpgraded: currentUser.stats.shipsUpgraded,
    achievementsUnlocked: currentUser.achievementsUnlocked,
    updatedAt: new Date().toISOString(),
  }
}

export function calculateLeaderboardScore(snapshot: LeaderboardPlayerSnapshot): number {
  return (
    snapshot.resourcesCollected +
    snapshot.scansCompleted * RANKING_WEIGHTS.scan +
    snapshot.shipsUpgraded * RANKING_WEIGHTS.shipUpgrade +
    snapshot.achievementsUnlocked * RANKING_WEIGHTS.achievement
  )
}

export function rankLeaderboardEntries(snapshots: LeaderboardPlayerSnapshot[]): LeaderboardEntry[] {
  return snapshots
    .map((snapshot) => ({
      ...snapshot,
      score: calculateLeaderboardScore(snapshot),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.resourcesCollected !== a.resourcesCollected) {
        return b.resourcesCollected - a.resourcesCollected
      }
      if (b.achievementsUnlocked !== a.achievementsUnlocked) {
        return b.achievementsUnlocked - a.achievementsUnlocked
      }
      return a.walletAddress.localeCompare(b.walletAddress)
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
}

async function fetchBackendLeaderboard(signal?: AbortSignal): Promise<LeaderboardPlayerSnapshot[]> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (!apiBaseUrl) return []

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/leaderboard`, { signal })
    if (!response.ok) return []

    const payload = (await response.json()) as { entries?: unknown[] } | unknown[]
    const entries = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.entries)
        ? payload.entries
        : []

    return entries.flatMap((entry) => {
      const normalized = normalizeSnapshot(entry)
      return normalized ? [normalized] : []
    })
  } catch {
    return []
  }
}

function buildLocalLeaderboard(
  currentUser?: LeaderboardCurrentUser | null
): LeaderboardPlayerSnapshot[] {
  const userSnapshot = currentUserSnapshot(currentUser)
  return userSnapshot ? [...SEEDED_RIVALS, userSnapshot] : SEEDED_RIVALS
}

export async function fetchLeaderboardPage({
  page,
  pageSize,
  currentUser,
  signal,
}: FetchLeaderboardOptions): Promise<LeaderboardPage> {
  const backendEntries = await fetchBackendLeaderboard(signal)
  const localUser = currentUserSnapshot(currentUser)
  const sourceEntries =
    backendEntries.length > 0
      ? [
          ...backendEntries.filter((entry) => entry.walletAddress !== localUser?.walletAddress),
          ...(localUser ? [localUser] : []),
        ]
      : buildLocalLeaderboard(currentUser)

  const ranked = rankLeaderboardEntries(sourceEntries)
  const safePageSize = Math.max(1, pageSize)
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * safePageSize

  return {
    entries: ranked.slice(start, start + safePageSize),
    total: ranked.length,
    page: safePage,
    pageSize: safePageSize,
    source: backendEntries.length > 0 ? 'backend' : 'local',
    rankingAlgorithm: LEADERBOARD_RANKING_ALGORITHM,
  }
}
