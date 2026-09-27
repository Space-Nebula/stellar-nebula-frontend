import { useState, useId } from 'react'
import type { WebSocketManager, WSStatus } from '@/services/websocket'
import { useWebSocketStatus } from '@/hooks/useWebSocketStatus'

export interface WebSocketStatusProps {
  manager?: WebSocketManager
  variant?: 'pill' | 'banner' | 'compact'
  showWhenConnected?: boolean
  className?: string
  style?: React.CSSProperties
}

const statusColors: Record<WSStatus, string> = {
  open: '#32d6a5',
  connecting: '#38bdf8',
  reconnecting: '#f59e0b',
  error: '#ef4444',
  closed: '#8ea0b9',
}

const statusLabels: Record<WSStatus, string> = {
  open: 'Connected',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  error: 'Connection error',
  closed: 'Disconnected',
}

export function WebSocketStatus({
  manager,
  variant = 'pill',
  showWhenConnected = true,
  className = '',
  style,
}: WebSocketStatusProps) {
  const {
    status,
    attempt,
    maxAttempts,
    nextRetryDelayMs,
    queuedMessageCount,
    isOnline,
    reconnect,
  } = useWebSocketStatus(manager)

  const [tooltipVisible, setTooltipVisible] = useState(false)
  const tooltipId = useId()

  // For banner variant, hide when connected if showWhenConnected is false
  if (!showWhenConnected && status === 'open') {
    return null
  }

  const color = statusColors[status]
  const label = statusLabels[status]
  const retrySeconds = nextRetryDelayMs ? Math.max(1, Math.round(nextRetryDelayMs / 1000)) : null

  const retryButton =
    status !== 'open' ? (
      <button
        type="button"
        onClick={reconnect}
        aria-label="Reconnect WebSocket"
        style={retryBtnStyle}
      >
        ↻ Retry
      </button>
    ) : null

  if (variant === 'banner') {
    return (
      <aside
        role="status"
        aria-live="polite"
        className={`websocket-status-banner ${className}`}
        style={{
          ...bannerContainerStyle,
          borderColor: `${color}40`,
          ...style,
        }}
      >
        <span
          style={{
            ...dotStyle,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}88`,
          }}
          aria-hidden="true"
        />
        <div style={bannerContentStyle}>
          <strong style={{ color: '#fff', fontSize: '0.85rem' }}>
            WebSocket: {label}
            {!isOnline && ' (Network Offline)'}
          </strong>
          {status === 'reconnecting' && (
            <span style={subtextStyle}>
              Attempt {attempt}
              {maxAttempts !== Infinity ? ` of ${maxAttempts}` : ''}
              {retrySeconds ? ` • Next attempt in ${retrySeconds}s` : ''}
            </span>
          )}
          {queuedMessageCount > 0 && (
            <span style={subtextStyle}>
              {queuedMessageCount} message{queuedMessageCount > 1 ? 's' : ''} queued for replay
            </span>
          )}
        </div>
        {retryButton}
      </aside>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className={`websocket-status-compact ${className}`}
        style={{ ...compactWrapperStyle, ...style }}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onFocus={() => setTooltipVisible(true)}
        onBlur={() => setTooltipVisible(false)}
        role="status"
        aria-live="polite"
        aria-describedby={tooltipVisible ? tooltipId : undefined}
        aria-label={`WebSocket status: ${label}`}
      >
        <span
          style={{
            ...dotStyle,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}aa`,
            animation:
              status === 'connecting' || status === 'reconnecting'
                ? 'pulse 1.4s ease-in-out infinite'
                : 'none',
          }}
          aria-hidden="true"
        />
        <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
          {label}
        </span>
        {queuedMessageCount > 0 && (
          <span style={badgeStyle} title={`${queuedMessageCount} queued messages`}>
            {queuedMessageCount}
          </span>
        )}

        {tooltipVisible && (
          <div id={tooltipId} role="tooltip" style={tooltipStyle}>
            <div style={tooltipRowStyle}>
              <span style={tooltipLabelStyle}>Status</span>
              <span style={{ color, fontWeight: 700 }}>{label}</span>
            </div>
            {status === 'reconnecting' && (
              <div style={tooltipRowStyle}>
                <span style={tooltipLabelStyle}>Attempt</span>
                <span style={tooltipValueStyle}>
                  {attempt}
                  {maxAttempts !== Infinity ? `/${maxAttempts}` : ''}
                </span>
              </div>
            )}
            {queuedMessageCount > 0 && (
              <div style={tooltipRowStyle}>
                <span style={tooltipLabelStyle}>Replay Outbox</span>
                <span style={tooltipValueStyle}>{queuedMessageCount} queued</span>
              </div>
            )}
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
              {retryButton}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Default 'pill' variant
  return (
    <div
      role="status"
      aria-live="polite"
      className={`websocket-status-pill ${className}`}
      style={{
        ...pillContainerStyle,
        borderColor: `${color}44`,
        ...style,
      }}
      aria-label={`WebSocket status: ${label}${status === 'reconnecting' ? `, attempt ${attempt}` : ''}`}
    >
      <span
        style={{
          ...dotStyle,
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}88`,
          animation:
            status === 'connecting' || status === 'reconnecting'
              ? 'pulse 1.4s ease-in-out infinite'
              : 'none',
        }}
        aria-hidden="true"
      />
      <div style={pillTextStyle}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fbff' }}>
          {label}
          {status === 'reconnecting' && ` (${attempt})`}
        </span>
        {queuedMessageCount > 0 && <span style={queueInfoStyle}>{queuedMessageCount} queued</span>}
      </div>
      {retryButton}
    </div>
  )
}

// ─── Inline Styles ────────────────────────────────────────────────────────────

const dotStyle: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: '50%',
  flexShrink: 0,
}

const pillContainerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 14px',
  borderRadius: 999,
  background: 'rgba(7, 17, 34, 0.85)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  transition: 'all 0.2s ease',
}

const pillTextStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const queueInfoStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#cbd5e1',
  background: 'rgba(255, 255, 255, 0.1)',
  padding: '1px 6px',
  borderRadius: 10,
}

const bannerContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 16px',
  borderRadius: 14,
  background: 'linear-gradient(180deg, rgba(13, 22, 41, 0.95), rgba(8, 14, 28, 0.98))',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(12px)',
}

const bannerContentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: 1,
}

const subtextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.7)',
}

const compactWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  cursor: 'pointer',
  outline: 'none',
}

const badgeStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  padding: '1px 5px',
  borderRadius: 8,
  background: 'rgba(245, 158, 11, 0.25)',
  color: '#fbbf24',
}

const retryBtnStyle: React.CSSProperties = {
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#f8fbff',
  padding: '3px 10px',
  borderRadius: 8,
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s ease',
  whiteSpace: 'nowrap',
}

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  background: '#0d1322',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: '0.75rem',
  color: '#f8fbff',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
  zIndex: 100,
  minWidth: 170,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const tooltipRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
}

const tooltipLabelStyle: React.CSSProperties = {
  color: '#8ea0b9',
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const tooltipValueStyle: React.CSSProperties = {
  fontWeight: 600,
}

export default WebSocketStatus
