import { useCallback, useEffect, useRef } from 'react'
import { useWalletConnect } from '@hooks/useWalletConnect'
import { WALLETCONNECT_PROJECT_ID_ENV } from '@config/walletconnect'
import { Spinner } from '@components/UI/Spinner'

interface WalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * WalletConnect pairing modal for mobile wallets (#458).
 *
 * The QR code and the "open in wallet" deep link are rendered by the
 * WalletConnect modal itself once `connect()` creates a session proposal:
 *
 * - Desktop: the WalletConnect QR modal appears; scan it with a mobile wallet.
 * - Mobile: the WalletConnect modal offers deep links into installed wallets.
 *
 * This component owns the surrounding explanation, configuration errors and
 * accessible states, while the wallet state stays in `WalletContext`.
 */
export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { isConfigured, isConnected, isConnecting, error, connect, clearError } = useWalletConnect()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  // Close automatically once the session is approved.
  useEffect(() => {
    if (isOpen && isConnected) onClose()
  }, [isOpen, isConnected, onClose])

  const handleClose = useCallback(() => {
    clearError()
    onClose()
  }, [clearError, onClose])

  const handleConnect = useCallback(async () => {
    await connect()
  }, [connect])

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      aria-label="Connect with WalletConnect"
      aria-modal="true"
      onClose={handleClose}
      style={dialogStyle}
    >
      <div style={panelStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Connect with WalletConnect</h2>
          <button
            type="button"
            aria-label="Close WalletConnect modal"
            onClick={handleClose}
            style={closeButtonStyle}
          >
            ✕
          </button>
        </div>

        <p style={subtitleStyle}>Scan the QR code with a mobile Stellar wallet.</p>

        {!isConfigured ? (
          <div role="alert" style={errorBoxStyle}>
            <span aria-hidden="true">⚠</span>
            <span>
              WalletConnect is not configured. Set <code>{WALLETCONNECT_PROJECT_ID_ENV}</code> and
              restart the app.
            </span>
          </div>
        ) : (
          <div style={qrPanelStyle} aria-hidden="true">
            <span style={qrGlyphStyle}>▦</span>
            <span style={qrHintStyle}>A QR code opens here when you continue</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={!isConfigured || isConnecting}
          aria-label="Open WalletConnect QR code"
          style={{
            ...connectButtonStyle,
            ...(!isConfigured || isConnecting ? connectButtonDisabledStyle : {}),
          }}
        >
          {isConnecting ? 'Waiting for approval…' : 'Show QR code'}
        </button>

        {isConnecting && (
          <div style={loadingRowStyle} aria-live="polite">
            <Spinner size="sm" text="Approve the connection in your wallet" />
          </div>
        )}

        {error && !isConnecting && (
          <div role="alert" style={errorBoxStyle}>
            <span aria-hidden="true">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <p style={footnoteStyle}>
          On a phone? WalletConnect offers a deep link into your installed wallet. No QR scanner
          needed.
        </p>
      </div>
    </dialog>
  )
}

const dialogStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  margin: 'auto',
  padding: 0,
  border: 'none',
  borderRadius: 16,
  backgroundColor: 'transparent',
  maxWidth: '90vw',
  width: 420,
}

const panelStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  border: '1px solid rgba(100, 108, 255, 0.3)',
  borderRadius: 16,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.15em',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.95)',
}

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: 18,
  cursor: 'pointer',
  padding: '4px 8px',
  lineHeight: 1,
  borderRadius: 6,
}

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.85em',
  color: 'rgba(255, 255, 255, 0.55)',
}

const qrPanelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '18px 12px',
  borderRadius: 12,
  border: '1px dashed rgba(100, 108, 255, 0.45)',
  backgroundColor: 'rgba(100, 108, 255, 0.06)',
}

const qrGlyphStyle: React.CSSProperties = {
  fontSize: 42,
  color: 'rgba(165, 173, 255, 0.8)',
}

const qrHintStyle: React.CSSProperties = {
  fontSize: '0.75em',
  color: 'rgba(255, 255, 255, 0.45)',
  textAlign: 'center',
}

const connectButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid rgba(100, 108, 255, 0.5)',
  backgroundColor: 'rgba(100, 108, 255, 0.16)',
  color: '#a5adff',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.9em',
}

const connectButtonDisabledStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
}

const loadingRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
}

const errorBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 8,
  backgroundColor: 'rgba(248, 113, 113, 0.1)',
  border: '1px solid rgba(248, 113, 113, 0.3)',
  color: '#f87171',
  fontSize: '0.82em',
  lineHeight: 1.4,
}

const footnoteStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.75em',
  color: 'rgba(255, 255, 255, 0.35)',
  textAlign: 'center',
}
