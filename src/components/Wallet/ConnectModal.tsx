import { useCallback, useEffect, useRef } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Spinner } from '@components/UI/Spinner'
import type { WalletType } from '@/types'

// ─── Wallet option descriptors ────────────────────────────────────────────────

interface WalletOption {
  type: WalletType
  name: string
  description: string
  icon: string
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    type: 'freighter',
    name: 'Freighter',
    description: 'Browser extension wallet (Supports Ledger & Hardware Wallets)',
    icon: '🚀',
  },
  {
    type: 'albedo',
    name: 'Albedo',
    description: 'Web-based wallet — no extension required',
    icon: '🌐',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface ConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const { connect, isLoading, error, isFreighterInstalled, isAlbedoAvailable, clearError } =
    useWallet()

  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  // Close on backdrop click or Escape key
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        clearError()
        onClose()
      }
    },
    [onClose, clearError]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') {
        clearError()
        onClose()
      }
    },
    [onClose, clearError]
  )

  const handleClose = useCallback(() => {
    clearError()
    onClose()
  }, [onClose, clearError])

  const handleConnect = useCallback(
    async (type: WalletType) => {
      await connect(type)
      // Only close modal on success (error stays visible until resolved)
      if (!error) {
        onClose()
      }
    },
    [connect, error, onClose]
  )

  const isAvailable = useCallback(
    (type: WalletType): boolean => {
      if (type === 'freighter') return isFreighterInstalled
      if (type === 'albedo') return isAlbedoAvailable
      return false
    },
    [isFreighterInstalled, isAlbedoAvailable]
  )

  if (!isOpen) return null

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-label="Connect wallet"
      aria-modal="true"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      style={dialogStyle}
    >
      <div style={panelStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>Connect Wallet</h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={handleClose}
            style={closeButtonStyle}
          >
            ✕
          </button>
        </div>

        <p style={subtitleStyle}>Choose your Stellar wallet to get started</p>

        {/* Wallet options */}
        <div role="list" style={optionListStyle}>
          {WALLET_OPTIONS.map((opt) => {
            const available = isAvailable(opt.type)
            return (
              <div key={opt.type} role="listitem" style={optionItemStyle}>
                <button
                  type="button"
                  disabled={isLoading || !available}
                  aria-label={`Connect with ${opt.name} wallet${!available ? ' (not installed)' : ''}`}
                  onClick={() => handleConnect(opt.type)}
                  aria-disabled={!available}
                  style={{
                    ...walletButtonStyle,
                    ...(available ? walletButtonAvailableStyle : walletButtonUnavailableStyle),
                  }}
                >
                  <span style={walletIconStyle} aria-hidden="true">
                    {opt.icon}
                  </span>
                  <div style={walletInfoStyle}>
                    <span style={walletNameStyle}>{opt.name}</span>
                    <span style={walletDescStyle}>{opt.description}</span>
                  </div>
                  <span
                    style={{
                      ...statusBadgeStyle,
                      ...(available ? badgeAvailableStyle : badgeUnavailableStyle),
                    }}
                  >
                    {available ? 'Available' : 'Not installed'}
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div style={loadingOverlayStyle} aria-live="polite">
            <Spinner size="md" text="Connecting…" />
          </div>
        )}

        {/* Error message */}
        {error && !isLoading && (
          <div role="alert" style={errorBoxStyle}>
            <span style={errorIconStyle} aria-hidden="true">
              ⚠
            </span>
            <span>{error}</span>
          </div>
        )}

        <p style={footerNoteStyle}>
          Don&apos;t have a wallet?{' '}
          <a
            href="https://www.freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            Get Freighter
          </a>
        </p>
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
  fontSize: '1.2em',
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
  color: 'rgba(255, 255, 255, 0.5)',
}

const optionListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const optionItemStyle: React.CSSProperties = {
  display: 'flex',
}

const walletButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid rgba(100, 108, 255, 0.25)',
  cursor: 'pointer',
  transition: 'border-color 0.2s, background-color 0.2s',
  textAlign: 'left',
}

const walletButtonAvailableStyle: React.CSSProperties = {
  backgroundColor: 'rgba(100, 108, 255, 0.08)',
  color: 'rgba(255, 255, 255, 0.9)',
}

const walletButtonUnavailableStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  color: 'rgba(255, 255, 255, 0.35)',
  cursor: 'not-allowed',
}

const walletIconStyle: React.CSSProperties = {
  fontSize: 24,
  flexShrink: 0,
}

const walletInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: 1,
  minWidth: 0,
}

const walletNameStyle: React.CSSProperties = {
  fontSize: '0.95em',
  fontWeight: 600,
}

const walletDescStyle: React.CSSProperties = {
  fontSize: '0.75em',
  color: 'rgba(255, 255, 255, 0.45)',
}

const statusBadgeStyle: React.CSSProperties = {
  fontSize: '0.7em',
  padding: '2px 8px',
  borderRadius: 20,
  fontWeight: 500,
  flexShrink: 0,
}

const badgeAvailableStyle: React.CSSProperties = {
  backgroundColor: 'rgba(74, 222, 128, 0.15)',
  color: '#4ade80',
}

const badgeUnavailableStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.07)',
  color: 'rgba(255, 255, 255, 0.3)',
}

const loadingOverlayStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '8px 0',
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

const errorIconStyle: React.CSSProperties = {
  flexShrink: 0,
  marginTop: 1,
}

const footerNoteStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.78em',
  color: 'rgba(255, 255, 255, 0.35)',
  textAlign: 'center',
}

const linkStyle: React.CSSProperties = {
  color: '#646cff',
  textDecoration: 'underline',
}
