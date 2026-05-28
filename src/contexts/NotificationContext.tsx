import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type NotificationType = 'event' | 'transaction' | 'achievement'

export interface AppNotification {
  id: string
  title: string
  description: string
  type: NotificationType
  createdAt: string
  read: boolean
}

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  addNotification: (input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markAsRead: (id: string) => void
  clearAll: () => void
  markAllAsRead: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const addNotification = useCallback(
    (input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const createdAt = new Date().toISOString()

      setNotifications((current) => [{ ...input, id, createdAt, read: false }, ...current])
    },
    [],
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  )

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      clearAll,
      markAllAsRead,
    }),
    [notifications, unreadCount, addNotification, markAsRead, clearAll, markAllAsRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
