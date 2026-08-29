import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculateLeaderboardScore,
  fetchLeaderboardPage,
  rankLeaderboardEntries,
  type LeaderboardPlayerSnapshot,
} from '../leaderboard'
import type { AchievementStats } from '@/store'

const baseEntry: LeaderboardPlayerSnapshot = {
  playerId: 'pilot-a',
  walletAddress: 'GA',
  scansCompleted: 1,
  resourcesCollected: 100,
  shipsUpgraded: 0,
  achievementsUnlocked: 0,
  updatedAt: '2026-08-20T00:00:00.000Z',
}

const emptyStats: AchievementStats = {
  scansCompleted: 0,
  resourcesCollected: 0,
  resourcesByType: {
    credits: 0,
    fuel: 0,
    minerals: 0,
    nebulaDust: 0,
    nebulite: 0,
    stellarium: 0,
    voidcrystal: 0,
    darkMatter: 0,
  },
  shipsUpgraded: 0,
  sharesCreated: 0,
}

describe('leaderboard service', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('calculates score from resources, scans, upgrades, and achievements', () => {
    expect(
      calculateLeaderboardScore({
        ...baseEntry,
        scansCompleted: 2,
        resourcesCollected: 500,
        shipsUpgraded: 1,
        achievementsUnlocked: 2,
      })
    ).toBe(3650)
  })

  it('ranks entries by score with deterministic tie breakers', () => {
    const ranked = rankLeaderboardEntries([
      { ...baseEntry, playerId: 'low', walletAddress: 'GC', resourcesCollected: 200 },
      { ...baseEntry, playerId: 'high', walletAddress: 'GB', shipsUpgraded: 1 },
      { ...baseEntry, playerId: 'tie', walletAddress: 'GA', shipsUpgraded: 1 },
    ])

    expect(ranked.map((entry) => entry.playerId)).toEqual(['tie', 'high', 'low'])
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3])
  })

  it('falls back to local leaderboard data and includes current user', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    const page = await fetchLeaderboardPage({
      page: 1,
      pageSize: 10,
      currentUser: {
        walletAddress: 'GLOCAL',
        stats: { ...emptyStats, scansCompleted: 2, resourcesCollected: 500 },
        achievementsUnlocked: 1,
      },
    })

    expect(page.source).toBe('local')
    expect(page.entries.some((entry) => entry.walletAddress === 'GLOCAL')).toBe(true)
  })

  it('normalizes backend data before ranking', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          entries: [
            {
              player_id: 'remote',
              wallet_address: 'GREMOTE',
              scans_completed: 5,
              resources_collected: 900,
              ships_upgraded: 1,
              achievements_unlocked: 2,
            },
          ],
        }),
      })
    )

    const page = await fetchLeaderboardPage({ page: 1, pageSize: 10 })

    expect(page.source).toBe('backend')
    expect(page.entries[0]).toMatchObject({
      playerId: 'remote',
      walletAddress: 'GREMOTE',
      rank: 1,
    })
  })
})
