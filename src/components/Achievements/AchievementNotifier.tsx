import { useEffect, useRef } from 'react'
import { useNotifications } from '@/contexts'
import { useAchievementStore } from '@/store'
import { AchievementNotification } from './AchievementNotification'

export function AchievementNotifier() {
  const pendingNotifications = useAchievementStore((state) => state.pendingNotifications)
  const dismissAchievementNotification = useAchievementStore(
    (state) => state.dismissAchievementNotification
  )
  const { addNotification } = useNotifications()
  const announcedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const achievement of pendingNotifications) {
      if (announcedIds.current.has(achievement.id)) continue
      announcedIds.current.add(achievement.id)

      addNotification({
        type: 'achievement',
        title: achievement.title,
        description: achievement.description,
      })
    }
  }, [addNotification, pendingNotifications])

  return (
    <AchievementNotification
      notifications={pendingNotifications}
      onDismiss={dismissAchievementNotification}
    />
  )
}
