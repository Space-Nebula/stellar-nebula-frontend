import type { StellarNetwork } from '@/types'
import { getTransactionExplorerUrl, shortenTransactionHash } from '@utils/horizon-links'

export type TransactionToastStatus = 'pending' | 'success' | 'error'

export interface TransactionToastProps {
  status: TransactionToastStatus
  message: string
  /** Transaction hash; when valid, a Stellar Expert link is rendered. */
  hash?: string | null
  network?: StellarNetwork
  onDismiss: () => void
}

const STATUS_ICON: Record<TransactionToastStatus, string> = {
  pending: '⏳',
  success: '✅',
  error: '⚠️',
}

const STATUS_COLOR: Record<TransactionToastStatus, string> = {
  pending: '#9fd8ff',
  success: '#4ade80',
  error: '#f87171',
}

/**
 * Content of a transaction notification.
 *
 * Success and failure toasts get an explorer link so the person can verify the
 * on-chain result themselves; failures are announced assertively to screen
 * readers, pending/success updates politely.
 *
 * @example
 * <TransactionToast
 *   status="success"
 *   message="Ship upgrade confirmed"
 *   hash={txHash}
 *   network="testnet"
 *   onDismiss={() => toast.dismiss(id)}
 * />
 */
export function TransactionToast({
  status,
  message,
  hash,
  network = 'testnet',
  onDismiss,
}: TransactionToastProps) {
  const explorerUrl = getTransactionExplorerUrl(hash, network)
  const isAlert = status === 'error'
  const isPending = status === 'pending'

  return (
    <div
      data-testid="transaction-toast"
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      aria-busy={isPending || undefined}
      style={containerStyle}
    >
      <span aria-hidden="true" style={{ ...iconStyle, color: STATUS_COLOR[status] }}>
        {STATUS_ICON[status]}
      </span>

      <div style={contentStyle}>
        <span style={messageStyle}>{message}</span>

        {hash && (
          <span style={hashLineStyle}>
            <span style={hashLabelStyle}>Tx</span>{' '}
            <span style={hashValueStyle}>{shortenTransactionHash(hash)}</span>
          </span>
        )}

        {explorerUrl && status !== 'pending' && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
            aria-label={`View transaction ${hash} on Stellar Expert`}
          >
            View on Explorer ↗
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={dismissStyle}
      >
        ✕
      </button>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  width: '100%',
}

const iconStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: 16,
  lineHeight: 1.4,
}

const contentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: 1,
  minWidth: 0,
}

const messageStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.88em',
}

const hashLineStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.72em',
  color: 'rgba(248, 251, 255, 0.6)',
}

const hashLabelStyle: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const hashValueStyle: React.CSSProperties = {
  color: 'rgba(248, 251, 255, 0.85)',
}

const linkStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  marginTop: 2,
  fontSize: '0.75em',
  fontWeight: 600,
  color: '#9fd8ff',
  textDecoration: 'underline',
}

const dismissStyle: React.CSSProperties = {
  flexShrink: 0,
  background: 'none',
  border: 'none',
  color: 'rgba(248, 251, 255, 0.45)',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1,
  padding: '2px 4px',
  borderRadius: 4,
}
