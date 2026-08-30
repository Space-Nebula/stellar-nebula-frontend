import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@/contexts'
import { buildAchievements, useAchievementStore } from '@/store'
import {
  fetchLeaderboardPage,
  type LeaderboardEntry,
  type LeaderboardPage,
} from '@/services/leaderboard'
import { ShareButton } from '@/components/Social/ShareButton'

const ITEMS_PER_PAGE = 10
const LOCAL_PLAYER_WALLET = 'LOCAL-PLAYER'
const EMPTY_ENTRIES: LeaderboardEntry[] = []

function truncateWallet(walletAddress: string): string {
  if (walletAddress.length <= 14) return walletAddress
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`
}

export function Leaderboard() {
  const { walletState } = useWallet()
  const stats = useAchievementStore((state) => state.stats)
  const unlockedAtById = useAchievementStore((state) => state.unlockedAtById)
  const achievementsUnlocked = useMemo(
    () =>
      buildAchievements(stats, unlockedAtById).filter((achievement) => achievement.unlocked).length,
    [stats, unlockedAtById]
  )
  const currentWalletAddress = walletState.publicKey ?? LOCAL_PLAYER_WALLET
  const [leaderboard, setLeaderboard] = useState<LeaderboardPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const loadLeaderboard = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)

      try {
        const page = await fetchLeaderboardPage({
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
          signal,
          currentUser: {
            walletAddress: currentWalletAddress,
            stats,
            achievementsUnlocked,
          },
        })
        setLeaderboard(page)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard data.')
      } finally {
        setLoading(false)
      }
    },
    [achievementsUnlocked, currentPage, currentWalletAddress, stats]
  )

  useEffect(() => {
    const controller = new AbortController()
    const initialLoad = window.setTimeout(() => {
      void loadLeaderboard(controller.signal)
    }, 0)

    const interval = window.setInterval(() => {
      void loadLeaderboard()
    }, 30_000)

    return () => {
      controller.abort()
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [loadLeaderboard])

  const totalPages = Math.max(1, Math.ceil((leaderboard?.total ?? 0) / ITEMS_PER_PAGE))
  const entries = leaderboard?.entries ?? EMPTY_ENTRIES

  const currentEntry = useMemo(
    () => entries.find((entry) => entry.walletAddress === currentWalletAddress) ?? null,
    [currentWalletAddress, entries]
  )

  function renderRank(entry: LeaderboardEntry) {
    if (entry.rank > 3) return <span className="leaderboard-rank-standard">{entry.rank}</span>

    return <span className={`leaderboard-medal leaderboard-medal-${entry.rank}`}>{entry.rank}</span>
  }

  if (loading && !leaderboard) {
    return (
      <div className="leaderboard-empty" role="status">
        Loading leaderboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="leaderboard-empty leaderboard-error" role="alert">
        <p>{error}</p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void loadLeaderboard()}
          aria-label="Retry loading leaderboard"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <section className="leaderboard-panel" aria-label="Galactic leaderboard">
      <div className="leaderboard-header">
        <div>
          <p className="eyebrow">Competition</p>
          <h1>Galactic Leaderboard</h1>
          <p className="page-copy">
            Rankings use harvested resources, completed scans, ship upgrades, and unlocked
            achievements.
          </p>
        </div>

        <div className="leaderboard-summary">
          <span>{leaderboard?.source === 'backend' ? 'Backend data' : 'Local fallback'}</span>
          <strong>{leaderboard?.total ?? 0} explorers</strong>
          {currentEntry && (
            <ShareButton
              title={`Rank ${currentEntry.rank} on Stellar Nebula`}
              description={`Score ${currentEntry.score.toLocaleString()} from scans, upgrades, and achievements.`}
              subject="leaderboard"
              playerStats={{
                rank: currentEntry.rank,
                score: currentEntry.score,
                scans: stats.scansCompleted,
                upgrades: stats.shipsUpgraded,
                resources: stats.resourcesCollected,
              }}
            />
          )}
        </div>
      </div>

      <p className="leaderboard-algorithm">{leaderboard?.rankingAlgorithm}</p>

      <div className="leaderboard-table-wrap">
        <table className="leaderboard-table" aria-label="Leaderboard rankings">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Explorer</th>
              <th>Score</th>
              <th>Resources</th>
              <th>Scans</th>
              <th>Upgrades</th>
              <th>Achievements</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isCurrentUser = entry.walletAddress === currentWalletAddress

              return (
                <tr
                  key={`${entry.walletAddress}-${entry.rank}`}
                  className={isCurrentUser ? 'is-current-user' : ''}
                >
                  <td>{renderRank(entry)}</td>
                  <td>
                    <strong>{isCurrentUser ? 'You' : entry.playerId}</strong>
                    <span>{truncateWallet(entry.walletAddress)}</span>
                  </td>
                  <td>{entry.score.toLocaleString()}</td>
                  <td>{entry.resourcesCollected.toLocaleString()}</td>
                  <td>{entry.scansCompleted.toLocaleString()}</td>
                  <td>{entry.shipsUpgraded.toLocaleString()}</td>
                  <td>{entry.achievementsUnlocked.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="leaderboard-empty">No explorers have posted scores yet.</div>
      )}

      <div className="leaderboard-pagination">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div>
          <button
            type="button"
            className="secondary-button"
            aria-label="Go to previous leaderboard page"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="secondary-button"
            aria-label="Go to next leaderboard page"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}
