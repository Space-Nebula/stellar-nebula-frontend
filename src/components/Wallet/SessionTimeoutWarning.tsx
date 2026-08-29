import { useEffect, useRef } from 'react'

interface SessionTimeoutWarningProps {
  isOpen: boolean
  remainingSeconds: number
  onExtend: () => void
  onDisconnect: () => void
}

export function SessionTimeoutWarning({
  isOpen,
  remainingSeconds,
  onExtend,
  onDisconnect,
}: SessionTimeoutWarningProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      aria-label="Session Inactivity Warning"
      aria-modal="true"
      style={dialogStyle}
    >
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={warningIconStyle} aria-hidden="true">
            ⏳
          </span>
          <h2 style={titleStyle}>Session Expiring Soon</h2>
        </div>

        <p style={messageStyle}>
          You have been inactive. For your security, your wallet session will automatically
          disconnect in:
        </p>

        <div
          style={timerBoxStyle}
          aria-live="polite"
          aria-label={`${remainingSeconds} seconds remaining`}
        >
          <span style={timerNumberStyle}>{remainingSeconds}</span>
          <span style={timerLabelStyle}>seconds</span>
        </div>

        <div style={buttonGroupStyle}>
          <button type="button" onClick={onExtend} style={extendButtonStyle}>
            Stay Connected
          </button>
          <button type="button" onClick={onDisconnect} style={disconnectButtonStyle}>
            Disconnect Now
          </button>
        </div>
      </div>
    </dialog>
  )
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const dialogStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  margin: 'auto',
  padding: 0,
  border: 'none',
  borderRadius: 16,
  backgroundColor: 'transparent',
  maxWidth: '90vw',
  width: 400,
  zIndex: 1000,
}

const panelStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  borderRadius: 16,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 16,
  boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const warningIconStyle: React.CSSProperties = {
  fontSize: 24,
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.2em',
  fontWeight: 600,
  color: '#f87171',
}

const messageStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.88em',
  color: 'rgba(255, 255, 255, 0.75)',
  lineHeight: 1.5,
}

const timerBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 24px',
  borderRadius: 12,
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  width: '100%',
}

const timerNumberStyle: React.CSSProperties = {
  fontSize: '2em',
  fontWeight: 700,
  color: '#ef4444',
  fontFamily: 'monospace',
}

const timerLabelStyle: React.CSSProperties = {
  fontSize: '0.75em',
  color: 'rgba(255, 255, 255, 0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  width: '100%',
  marginTop: 8,
}

const extendButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  backgroundColor: '#6366f1',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '0.9em',
  cursor: 'pointer',
}

const disconnectButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backgroundColor: 'transparent',
  color: 'rgba(255, 255, 255, 0.7)',
  fontWeight: 500,
  fontSize: '0.9em',
  cursor: 'pointer',
}
