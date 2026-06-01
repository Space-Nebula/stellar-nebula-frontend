import React, { useState, useEffect } from 'react'
import type { Achievement } from './types'

interface NotificationProps {
  achievement: Achievement
  onDismiss: (id: string) => void
}

const NotificationItem: React.FC<NotificationProps> = ({ achievement, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(achievement.id)
    }, 5000)
    return () => clearTimeout(timer)
  }, [achievement.id, onDismiss])

  const rarityBorders = {
    common: 'border-gray-400',
    rare: 'border-cosmic-cyan',
    epic: 'border-cosmic-purple',
    legendary: 'border-yellow-400',
  }

  return (
    <div
      className={`flex items-center gap-3 bg-space-900 border-l-4 ${rarityBorders[achievement.rarity]} p-4 rounded shadow-cosmic animate-[slideIn_0.3s_ease-out]`}
    >
      <div className="text-3xl">{achievement.icon}</div>
      <div className="flex-1">
        <h4 className="text-white font-bold text-sm">Achievement Unlocked!</h4>
        <p className="text-cosmic-cyan text-sm">{achievement.title}</p>
      </div>
      <button onClick={() => onDismiss(achievement.id)} className="text-space-100 hover:text-white">
        ✕
      </button>
    </div>
  )
}

export const AchievementNotification: React.FC<{ notifications: Achievement[] }> = ({
  notifications,
}) => {
  const [active, setActive] = useState<Achievement[]>([])

  useEffect(() => {
    setActive(notifications)
  }, [notifications])

  const handleDismiss = (id: string) => {
    setActive((prev) => prev.filter((n) => n.id !== id))
  }

  if (active.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {active.map((achievement) => (
        <NotificationItem
          key={achievement.id}
          achievement={achievement}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  )
}
