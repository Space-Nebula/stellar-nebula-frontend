import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowNotification(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showNotification && isOnline) return null

  return (
    <div
      style={{
        ...indicatorStyle,
        ...(isOnline ? onlineStyle : offlineStyle),
      }}
      role="status"
      aria-live="polite"
    >
      <span style={iconStyle}>{isOnline ? '✓' : '⚠'}</span>
      <span style={textStyle}>
        {isOnline ? 'Back online' : 'You are offline - Some features may be limited'}
      </span>
    </div>
  )
}

const indicatorStyle: React.CSSProperties = {
  position: 'fixed',
  top: '1rem',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.875rem 1.5rem',
  borderRadius: '999px',
  fontSize: '0.9rem',
  fontWeight: 600,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  animation: 'slideDown 0.3s ease-out',
}

const onlineStyle: React.CSSProperties = {
  backgroundColor: 'rgba(50, 214, 165, 0.95)',
  color: '#07111f',
  border: '1px solid rgba(50, 214, 165, 1)',
}

const offlineStyle: React.CSSProperties = {
  backgroundColor: 'rgba(245, 158, 11, 0.95)',
  color: '#07111f',
  border: '1px solid rgba(245, 158, 11, 1)',
}

const iconStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  lineHeight: 1,
}

const textStyle: React.CSSProperties = {
  lineHeight: 1,
}
