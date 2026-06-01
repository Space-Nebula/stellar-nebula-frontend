import React from 'react'
import type { Achievement } from './types'

interface Props {
  achievement: Achievement
}

export const AchievementCard: React.FC<Props> = ({ achievement }) => {
  const percentage = Math.min(100, (achievement.progress / achievement.target) * 100)

  const rarityColors = {
    common: 'border-gray-500 text-gray-400',
    rare: 'border-cosmic-cyan text-cosmic-cyan',
    epic: 'border-cosmic-purple text-cosmic-purple',
    legendary: 'border-yellow-400 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]',
  }

  const rarityBgs = {
    common: 'bg-gray-500',
    rare: 'bg-cosmic-cyan',
    epic: 'bg-cosmic-purple',
    legendary: 'bg-yellow-400',
  }

  return (
    <div
      className={`p-4 rounded-xl border-2 bg-space-900 transition-all duration-300 ${
        achievement.unlocked
          ? rarityColors[achievement.rarity]
          : 'border-space-700 opacity-60 grayscale'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl rounded-lg bg-space-800 ${achievement.unlocked ? rarityColors[achievement.rarity] : 'text-space-100'}`}
        >
          {achievement.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h3
              className={`font-bold truncate ${achievement.unlocked ? 'text-white' : 'text-space-100'}`}
            >
              {achievement.title}
            </h3>
            {achievement.unlocked && (
              <span
                className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold border ${rarityColors[achievement.rarity]}`}
              >
                {achievement.rarity}
              </span>
            )}
          </div>

          <p className="text-sm text-space-100 mb-3 line-clamp-2">{achievement.description}</p>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-space-100">
              <span>Progress</span>
              <span>
                {achievement.progress} / {achievement.target}
              </span>
            </div>
            <div className="w-full bg-space-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${rarityBgs[achievement.rarity]}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {achievement.unlocked && achievement.unlockedAt && (
            <p className="text-xs text-space-100 mt-2 opacity-70">
              Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
