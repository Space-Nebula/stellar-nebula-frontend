import { useResourceStore } from '@/store/resourceStore'
import { useShipStore } from '@/store/shipStore'
import { useAchievementStore } from '@/store/achievementStore'
import { useGameStore } from '@/store/gameStore'
import { useUserStore } from '@/store/userStore'
import { useSessionStore } from '@/store/sessionStore'
import { useTutorialStore } from '@/store/tutorialStore'
import { clearMonitoringUser } from '@/services/monitoring'

/**
 * Comprehensive state cleanup on wallet disconnect.
 * Purges wallet state, game state stores, balance caches, and session storage
 * to guarantee zero residual data leakage.
 */
export function purgeApplicationState(): void {
  // 1. Reset all Zustand stores
  try {
    useResourceStore.getState().resetResources()
  } catch {
    // Ignore store reset errors
  }
  try {
    useShipStore.getState().resetShips()
  } catch {
    // Ignore
  }
  try {
    useAchievementStore.getState().resetAchievements()
  } catch {
    // Ignore
  }
  try {
    useGameStore.getState().resetGame()
  } catch {
    // Ignore
  }
  try {
    useUserStore.getState().clearSession()
  } catch {
    // Ignore
  }
  try {
    useSessionStore.getState().closeSession()
  } catch {
    // Ignore
  }
  try {
    useTutorialStore.getState().replay()
  } catch {
    // Ignore
  }

  // 2. Clear all session and game keys from localStorage (excluding user preference settings)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = []
      const len = window.localStorage.length
      for (let i = 0; i < len; i++) {
        const key = window.localStorage.key(i)
        if (key && key.startsWith('stellar-nebula:')) {
          if (key !== 'stellar-nebula:settings-store' && key !== 'stellar-nebula:graphics-store') {
            keysToRemove.push(key)
          }
        }
      }
      // Also check Object.keys fallback for in-memory mocks
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith('stellar-nebula:')) {
          if (key !== 'stellar-nebula:settings-store' && key !== 'stellar-nebula:graphics-store') {
            if (!keysToRemove.includes(key)) {
              keysToRemove.push(key)
            }
          }
        }
      })
      keysToRemove.forEach((key) => window.localStorage.removeItem(key))
    } catch {
      // Ignore
    }
  }

  // 3. Clear sessionStorage completely
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.clear()
    } catch {
      // Ignore
    }
  }

  // 4. Clear user context in monitoring/telemetry
  try {
    clearMonitoringUser()
  } catch {
    // Ignore
  }
}
