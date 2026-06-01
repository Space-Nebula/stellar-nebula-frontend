import React, { useState } from 'react'
import { AchievementCard } from './AchievementCard'
import type { Achievement } from './types'

// Mock achievements data
const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    title: 'First Scan',
    description: 'Complete your first sector scan.',
    icon: '📡',
    progress: 1,
    target: 1,
    unlocked: true,
    rarity: 'common',
    unlockedAt: '2026-05-20T10:00:00Z',
  },
  {
    id: '2',
    title: '10 Scans',
    description: 'Complete 10 sector scans.',
    icon: '🔭',
    progress: 10,
    target: 10,
    unlocked: true,
    rarity: 'common',
    unlockedAt: '2026-05-22T14:30:00Z',
  },
  {
    id: '3',
    title: '100 Scans',
    description: 'Complete 100 sector scans.',
    icon: '🌌',
    progress: 42,
    target: 100,
    unlocked: false,
    rarity: 'rare',
  },
  {
    id: '4',
    title: 'Ship Upgrade',
    description: 'Upgrade your ship for the first time.',
    icon: '🚀',
    progress: 1,
    target: 1,
    unlocked: true,
    rarity: 'rare',
    unlockedAt: '2026-05-25T09:15:00Z',
  },
  {
    id: '5',
    title: 'Resource Trader',
    description: 'Make 50 successful trades on the marketplace.',
    icon: '💎',
    progress: 12,
    target: 50,
    unlocked: false,
    rarity: 'epic',
  },
  {
    id: '6',
    title: 'Nebula Explorer',
    description: 'Discover a hidden nebula anomaly.',
    icon: '🌀',
    progress: 0,
    target: 1,
    unlocked: false,
    rarity: 'legendary',
  },
]

export const AchievementList: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [sort, setSort] = useState<'progress' | 'rarity'>('progress')

  const filteredAchievements = MOCK_ACHIEVEMENTS.filter((a) => {
    if (filter === 'unlocked') return a.unlocked
    if (filter === 'locked') return !a.unlocked
    return true
  })

  const rarityValue = { common: 1, rare: 2, epic: 3, legendary: 4 }

  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (sort === 'rarity') {
      return rarityValue[b.rarity] - rarityValue[a.rarity]
    }
    // Default to progress
    const progressA = a.progress / a.target
    const progressB = b.progress / b.target
    return progressB - progressA
  })

  return (
    <div className="bg-space-950 p-6 rounded-xl border border-space-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Commander Achievements</h2>
          <p className="text-space-100 text-sm">
            Track your progress and unlock exclusive rewards.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-space-800 border border-space-700 text-white rounded px-3 py-1.5 outline-none focus:border-cosmic-cyan"
          >
            <option value="all">All Status</option>
            <option value="unlocked">Unlocked</option>
            <option value="locked">Locked</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-space-800 border border-space-700 text-white rounded px-3 py-1.5 outline-none focus:border-cosmic-cyan"
          >
            <option value="progress">Sort: Progress</option>
            <option value="rarity">Sort: Rarity</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAchievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {sortedAchievements.length === 0 && (
        <div className="text-center py-12 text-space-100">No achievements match your filters.</div>
      )}
    </div>
  )
}
