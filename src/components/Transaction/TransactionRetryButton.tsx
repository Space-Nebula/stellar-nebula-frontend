import type { TransactionRetryFrame } from '@/hooks/useTransactionRetry'

export interface TransactionRetryButtonProps<TPayload> {
  failure: TransactionRetryFrame<TPayload>
  isRetrying: boolean
  attempt: number
  maxAttempts: number
  onRetry: () => void
  onCancel?: () => void
  retryLabel?: string
}

/**
 * User-facing retry control for a failed transaction submission. Shows the
 * preserved failure (tx + error), the current retry attempt, and a Retry
 * button so the same transaction can be re-submitted without re-entering the
 * form.
 */
export function TransactionRetryButton<TPayload>({
  failure,
  isRetrying,
  attempt,
  maxAttempts,
  onRetry,
  onCancel,
  retryLabel = 'Retry transaction',
}: TransactionRetryButtonProps<TPayload>): JSX.Element {
  const exhausted = attempt >= maxAttempts && !isRetrying

  return (
    <div style={panelStyle} role="alert">
      <div style={headerRowStyle}>
        <p style={titleStyle}>{failure.label} failed to submit</p>
        <span style={badgeStyle}>{exhausted ? 'Max retries reached' : `Attempt ${attempt}/${maxAttempts}`}</span>
      </div>

      <p style={errorStyle}>{failure.error}</p>

      <div style={copyStyle}>
        Transaction <code style={codeStyle}>{failure.transactionId}</code> is preserved and can be
        re-submitted without re-entering the form.
      </div>

      <div style={buttonRowStyle}>
        {onCancel && (
          <button type="button" style={secondaryStyle} onClick={onCancel} disabled={isRetrying}>
            Dismiss
          </button>
        )}
        <button
          type="button"
          style={primaryStyle}
          onClick={onRetry}
          disabled={isRetrying || exhausted}
        >
          {isRetrying ? `Retrying ${attempt}…` : exhausted ? 'No more attempts' : retryLabel}
        </button>
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  borderRadius: 18,
  padding: '1rem',
  background: 'rgba(255, 99, 132, 0.1)',
  border: '1px solid rgba(255, 99, 132, 0.24)',
  marginBottom: 18,
}

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: '#ffc7d2',
  fontWeight: 800,
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '0.35rem 0.7rem',
  background: 'rgba(255, 99, 132, 0.16)',
  color: '#ffc7d2',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: '#ffb3c1',
  fontSize: 13,
}

const copyStyle: React.CSSProperties = {
  margin: 0,
  color: '#c8d4e6',
  fontSize: 13,
}

const codeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  color: '#f8fbff',
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
}

const primaryStyle: React.CSSProperties = {
  borderRadius: 999,
  border: 'none',
  background: '#ff6b81',
  color: '#07111f',
  fontWeight: 800,
  padding: '0.7rem 1.1rem',
}

const secondaryStyle: React.CSSProperties = {
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f8fbff',
  fontWeight: 700,
  padding: '0.7rem 1.1rem',
}