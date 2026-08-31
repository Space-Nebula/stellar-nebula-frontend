import React, { useMemo, useState } from 'react'
import { AchievementCard } from './AchievementCard'
import { buildAchievements, useAchievementStore } from '@/store'
import { ShareButton } from '@/components/Social/ShareButton'
import { EmptyAchievements } from '@/components/UI/EmptyStates'

export const AchievementList: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [sort, setSort] = useState<'progress' | 'rarity'>('progress')
  const stats = useAchievementStore((state) => state.stats)
  const unlockedAtById = useAchievementStore((state) => state.unlockedAtById)

  const achievements = useMemo(
    () => buildAchievements(stats, unlockedAtById),
    [stats, unlockedAtById]
  )

  const filteredAchievements = achievements.filter((a) => {
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
            onChange={(e) => setFilter(e.target.value as 'all' | 'unlocked' | 'locked')}
            className="bg-space-800 border border-space-700 text-white rounded px-3 py-1.5 outline-none focus:border-cosmic-cyan"
          >
            <option value="all">All Status</option>
            <option value="unlocked">Unlocked</option>
            <option value="locked">Locked</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'progress' | 'rarity')}
            className="bg-space-800 border border-space-700 text-white rounded px-3 py-1.5 outline-none focus:border-cosmic-cyan"
          >
            <option value="progress">Sort: Progress</option>
            <option value="rarity">Sort: Rarity</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            footer={
              achievement.unlocked ? (
                <ShareButton
                  title={achievement.title}
                  description={achievement.description}
                  subject="achievement"
                  playerStats={{
                    scans: stats.scansCompleted,
                    upgrades: stats.shipsUpgraded,
                    resources: stats.resourcesCollected,
                  }}
                  variant="icon"
                />
              ) : undefined
            }
          />
        ))}
      </div>

      {sortedAchievements.length === 0 &&
        (filter === 'unlocked' ? (
          <EmptyAchievements />
        ) : (
          <div className="text-center py-12 text-space-100">
            No achievements match your filters.
          </div>
        ))}
    </div>
  )
}
