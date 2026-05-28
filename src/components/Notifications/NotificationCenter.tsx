import { useEffect, useMemo, useRef, useState } from 'react'
import { useNotifications } from '@/contexts'

const typeLabelMap = {
  event: 'Game event',
  transaction: 'Transaction',
  achievement: 'Achievement',
} as const

function formatRelativeTime(value: string): string {
  const now = Date.now()
  const date = new Date(value).getTime()
  const delta = Math.max(0, Math.round((now - date) / 1000))

  if (delta < 60) return 'Just now'
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  return `${Math.floor(delta / 86400)}d ago`
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications()
  const containerRef = useRef<HTMLDivElement>(null)

  const panelLabel = useMemo(
    () => (unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'),
    [unreadCount],
  )

  useEffect(() => {
    if (!isOpen) return undefined

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="notification-center" ref={containerRef}>
      <button
        type="button"
        className="notification-trigger"
        aria-expanded={isOpen}
        aria-controls="notification-panel"
        onClick={() => setIsOpen((current) => !current)}
      >
        Notifications
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <aside
          id="notification-panel"
          className="notification-panel"
          aria-label={panelLabel}
          aria-live="polite"
        >
          <div className="notification-panel-header">
            <h2>Mission updates</h2>
            <div className="notification-actions">
              <button type="button" onClick={markAllAsRead}>
                Mark all read
              </button>
              <button type="button" onClick={clearAll}>
                Clear all
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="notification-empty">No updates yet. Mission events will appear here.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.read ? 'notification-item' : 'notification-item notification-item-unread'}
                >
                  <div>
                    <p className="notification-type">{typeLabelMap[notification.type]}</p>
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-description">{notification.description}</p>
                    <p className="notification-time">{formatRelativeTime(notification.createdAt)}</p>
                  </div>
                  {!notification.read && (
                    <button type="button" className="notification-mark-read" onClick={() => markAsRead(notification.id)}>
                      Mark as read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  )
}
