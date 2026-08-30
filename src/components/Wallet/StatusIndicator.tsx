import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateKey(key: string): string {
  if (key.length <= 12) return key
  return `${key.slice(0, 6)}…${key.slice(-6)}`
}

type Status = 'connected' | 'disconnected' | 'connecting'

function getStatus(isConnected: boolean, isLoading: boolean): Status {
  if (isLoading) return 'connecting'
  return isConnected ? 'connected' : 'disconnected'
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StatusIndicatorProps {
  onOpenConnectModal?: () => void
}

export function StatusIndicator({ onOpenConnectModal }: StatusIndicatorProps) {
  const { walletState, isLoading } = useWallet()
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const status = getStatus(walletState.isConnected, isLoading)

  return (
    <div
      style={wrapperStyle}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      onFocus={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(false)}
    >
      <button
        type="button"
        onClick={onOpenConnectModal}
        aria-label={`Wallet status: ${status}. Click to open wallet.`}
        style={buttonStyle(status)}
      >
        <span style={dotStyle(status)} />
        <span style={labelStyle}>{statusLabels[status]}</span>
      </button>

      {tooltipVisible && (
        <div role="tooltip" style={tooltipStyle}>
          {status === 'connected' && walletState.publicKey && (
            <>
              <div style={tooltipRowStyle}>
                <span style={tooltipLabelStyle}>Address</span>
                <span style={tooltipMonoStyle}>{truncateKey(walletState.publicKey)}</span>
              </div>
              <div style={tooltipRowStyle}>
                <span style={tooltipLabelStyle}>Wallet</span>
                <span style={tooltipValueStyle}>{walletState.walletType}</span>
              </div>
              <div style={{ ...tooltipRowStyle, marginBottom: 0 }}>
                <span style={tooltipLabelStyle}>Network</span>
                <span style={tooltipValueStyle}>{walletState.network}</span>
              </div>
            </>
          )}
          {status === 'disconnected' && (
            <span style={tooltipMessageStyle}>Wallet disconnected — click to connect</span>
          )}
          {status === 'connecting' && (
            <span style={tooltipMessageStyle}>Connecting to wallet…</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const statusLabels: Record<Status, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
}

const statusColors: Record<Status, string> = {
  connected: '#4ade80',
  disconnected: '#f87171',
  connecting: '#facc15',
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  position: 'relative',
}

const buttonStyle = (status: Status): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 14px',
  borderRadius: 12,
  border: `1px solid ${statusColors[status]}33`,
  backgroundColor: `${statusColors[status]}14`,
  color: 'rgba(255, 255, 255, 0.85)',
  cursor: 'pointer',
  fontSize: '0.82em',
  fontWeight: 500,
  transition: 'border-color 0.3s, background-color 0.3s',
})

const dotStyle = (status: Status): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: statusColors[status],
  boxShadow: `0 0 8px ${statusColors[status]}88`,
  animation:
    status === 'connecting' || status === 'connected' ? 'pulse 1.6s ease-in-out infinite' : 'none',
  flexShrink: 0,
})

const labelStyle: React.CSSProperties = {
  fontSize: 'inherit',
  lineHeight: 1,
}

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#0d0d1a',
  border: '1px solid rgba(100, 108, 255, 0.3)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: '0.74em',
  color: 'rgba(255, 255, 255, 0.85)',
  whiteSpace: 'nowrap',
  zIndex: 50,
  pointerEvents: 'none',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 220,
}

const tooltipRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  marginBottom: 4,
}

const tooltipLabelStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.55)',
  fontSize: '0.9em',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const tooltipMonoStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: '0.95em',
}

const tooltipValueStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.78)',
  textTransform: 'capitalize',
}

const tooltipMessageStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.65)',
  fontStyle: 'italic',
}
