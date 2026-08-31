import { useEffect, useState, useCallback } from 'react'

// Network Information API types (not in lib.dom yet for all browsers)
interface NetworkInformation extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  downlink?: number
  rtt?: number
  saveData?: boolean
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown'
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

type ConnectionQuality = 'offline' | 'slow' | 'fast' | 'unknown'

interface ConnectionInfo {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  type?: string
}

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined
  const nav = navigator as unknown as {
    connection?: NetworkInformation
    mozConnection?: NetworkInformation
    webkitConnection?: NetworkInformation
  }
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection
}

function deriveQuality(isOnline: boolean, conn?: ConnectionInfo | null): ConnectionQuality {
  if (!isOnline) return 'offline'
  if (!conn) return 'unknown'
  // saveData indicates user wants minimal data - treat as slow
  if (conn.saveData) return 'slow'
  // effectiveType is most reliable
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return 'slow'
  if (conn.effectiveType === '3g') {
    // 3g with good downlink could be considered fast-ish, but we treat as slow for caution
    if ((conn.downlink ?? 10) < 1.5) return 'slow'
    return 'fast'
  }
  if (conn.effectiveType === '4g') return 'fast'
  // Fallback to downlink / rtt
  if (conn.downlink !== undefined && conn.downlink < 1.0) return 'slow'
  if (conn.rtt !== undefined && conn.rtt > 500) return 'slow'
  if (conn.downlink !== undefined || conn.rtt !== undefined) return 'fast'
  return 'unknown'
}

function getConnectionInfo(conn?: NetworkInformation | null): ConnectionInfo | null {
  if (!conn) return null
  return {
    effectiveType: conn.effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData,
    type: conn.type,
  }
}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [showNotification, setShowNotification] = useState(false)
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(() =>
    getConnectionInfo(getConnection())
  )
  const [quality, setQuality] = useState<ConnectionQuality>(() =>
    deriveQuality(
      typeof navigator !== 'undefined' ? navigator.onLine : true,
      getConnectionInfo(getConnection())
    )
  )
  const [isRetrying, setIsRetrying] = useState(false)

  const updateConnection = useCallback(() => {
    const conn = getConnection()
    const info = getConnectionInfo(conn)
    setConnectionInfo(info)
    setQuality(deriveQuality(navigator.onLine, info))
  }, [])

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    updateConnection()

    // Attempt lightweight network check
    try {
      // Use a small fetch with cache busting to test connectivity
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      await fetch('https://horizon-futurenet.stellar.org', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => {
        // Even if horizon fails, try navigator.onLine as fallback
        if (navigator.onLine) {
          setIsOnline(true)
          setShowNotification(true)
          setTimeout(() => setShowNotification(false), 3000)
        }
      })
      clearTimeout(timeout)
    } finally {
      // Also check navigator.onLine immediately
      setIsOnline(navigator.onLine)
      if (navigator.onLine) {
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 3000)
      }
      setIsRetrying(false)
    }

    // Force re-check connection quality after retry
    setTimeout(updateConnection, 500)
  }, [updateConnection])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowNotification(true)
      updateConnection()
      setTimeout(() => setShowNotification(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowNotification(true)
      updateConnection()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // NetworkInformation API change listener
    const conn = getConnection()
    if (conn) {
      conn.addEventListener('change', updateConnection)
    }

    // Also poll connection periodically for browsers that don't fire change
    const interval = setInterval(updateConnection, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (conn) conn.removeEventListener('change', updateConnection)
      clearInterval(interval)
    }
  }, [updateConnection])

  // Determine visibility: always show when offline, or when slow, or briefly when back online
  const shouldShow = !isOnline || quality === 'slow' || showNotification
  if (!shouldShow) return null

  const qualityLabel =
    quality === 'offline'
      ? 'Offline'
      : quality === 'slow'
        ? 'Slow connection'
        : quality === 'fast'
          ? 'Online • Fast'
          : 'Online'

  const detailText = !isOnline
    ? 'You are offline - Some features may be limited'
    : quality === 'slow'
      ? `Slow connection${connectionInfo?.effectiveType ? ` (${connectionInfo.effectiveType})` : ''}${connectionInfo?.downlink ? ` • ${connectionInfo.downlink} Mbps` : ''} - Loading may be slower`
      : quality === 'fast'
        ? `Back online${connectionInfo?.effectiveType ? ` • ${connectionInfo.effectiveType}` : ''}${connectionInfo?.downlink ? ` • ${connectionInfo.downlink} Mbps` : ''}`
        : 'Back online'

  const isSlow = quality === 'slow'
  const isOffline = !isOnline

  return (
    <div
      style={{
        ...indicatorStyle,
        ...(isOffline ? offlineStyle : isSlow ? slowStyle : onlineStyle),
      }}
      role="status"
      aria-live="polite"
      aria-label={`Network status: ${qualityLabel}. ${detailText}`}
    >
      <span style={iconStyle} aria-hidden="true">
        {isOffline ? '⚠' : isSlow ? '◐' : '✓'}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
        <span style={{ ...textStyle, fontWeight: 700, fontSize: '0.85rem' }}>{qualityLabel}</span>
        <span style={{ ...textStyle, fontSize: '0.78rem', opacity: 0.92, lineHeight: 1.3 }}>
          {detailText}
        </span>
        {connectionInfo && (isSlow || isOffline) && (
          <span style={{ fontSize: '0.7rem', opacity: 0.8, fontFamily: 'monospace' }}>
            {connectionInfo.rtt ? `RTT: ${connectionInfo.rtt}ms` : ''}
            {connectionInfo.rtt && connectionInfo.downlink ? ' • ' : ''}
            {connectionInfo.downlink ? `↓ ${connectionInfo.downlink} Mbps` : ''}
            {connectionInfo.saveData ? ' • Data Saver on' : ''}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        aria-label={isOffline ? 'Retry connection' : 'Refresh connection status'}
        style={{
          ...retryButtonStyle,
          ...(isOffline ? retryOfflineStyle : isSlow ? retrySlowStyle : retryOnlineStyle),
          opacity: isRetrying ? 0.6 : 1,
          cursor: isRetrying ? 'wait' : 'pointer',
        }}
      >
        {isRetrying ? '⟳ Checking...' : '↻ Retry'}
      </button>
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
  padding: '0.875rem 1.25rem',
  borderRadius: '16px',
  fontSize: '0.85rem',
  fontWeight: 600,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0,0,0,0.2)',
  animation: 'slideDown 0.3s ease-out',
  maxWidth: 'min(92vw, 420px)',
  minWidth: 'min(88vw, 320px)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.12)',
}

const onlineStyle: React.CSSProperties = {
  backgroundColor: 'rgba(50, 214, 165, 0.96)',
  color: '#07111f',
  border: '1px solid rgba(50, 214, 165, 1)',
}

const slowStyle: React.CSSProperties = {
  backgroundColor: 'rgba(245, 158, 11, 0.96)',
  color: '#1a0f00',
  border: '1px solid rgba(245, 158, 11, 1)',
}

const offlineStyle: React.CSSProperties = {
  backgroundColor: 'rgba(239, 68, 68, 0.96)',
  color: '#fff',
  border: '1px solid rgba(239, 68, 68, 1)',
}

const iconStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  lineHeight: 1,
  flexShrink: 0,
  width: '1.75rem',
  height: '1.75rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  background: 'rgba(0,0,0,0.15)',
}

const textStyle: React.CSSProperties = {
  lineHeight: 1,
}

const retryButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  borderRadius: '999px',
  border: '1px solid rgba(0,0,0,0.15)',
  padding: '0.5rem 0.85rem',
  fontSize: '0.78rem',
  fontWeight: 800,
  minHeight: '2rem',
  minWidth: '4.5rem',
  transition: 'all 160ms ease',
  whiteSpace: 'nowrap',
}

const retryOnlineStyle: React.CSSProperties = {
  backgroundColor: 'rgba(7, 17, 31, 0.12)',
  color: '#07111f',
  border: '1px solid rgba(7, 17, 31, 0.2)',
}

const retrySlowStyle: React.CSSProperties = {
  backgroundColor: 'rgba(26, 15, 0, 0.12)',
  color: '#1a0f00',
  border: '1px solid rgba(26, 15, 0, 0.2)',
}

const retryOfflineStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  color: '#7f1d1d',
  border: '1px solid rgba(255,255,255,0.9)',
}
