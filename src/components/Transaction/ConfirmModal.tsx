import { useEffect, useRef } from 'react'

export interface ConfirmationDetail {
  label: string
  value: string
}

export interface ConfirmModalProps {
  isOpen: boolean
  title: string
  operationType: string
  estimatedFee: string
  details: ConfirmationDetail[]
  isSubmitting?: boolean
  error?: string | null
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

export function ConfirmModal({
  isOpen,
  title,
  operationType,
  estimatedFee,
  details,
  isSubmitting = false,
  error = null,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
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

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      aria-modal="true"
      className="transaction-confirm-modal"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>Transaction review</p>
            <h2 style={titleStyle}>{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation"
            style={closeStyle}
          >
            ✕
          </button>
        </div>

        <div style={badgeRowStyle}>
          <span style={badgeStyle}>{operationType}</span>
          <span style={feeStyle}>{estimatedFee}</span>
        </div>

        <div style={detailListStyle}>
          {details.map((detail) => (
            <div key={detail.label} style={detailRowStyle}>
              <span style={detailLabelStyle}>{detail.label}</span>
              <span style={detailValueStyle}>{detail.value}</span>
            </div>
          ))}
        </div>

        {children}

        {error && (
          <div role="alert" style={errorBoxStyle}>
            {error}
          </div>
        )}

        <div style={actionRowStyle}>
          <button
            type="button"
            onClick={onCancel}
            aria-label={`Cancel ${operationType} transaction`}
            style={secondaryButtonStyle}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            aria-label={`Confirm ${operationType} transaction`}
            onClick={onConfirm}
            style={primaryButtonStyle}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

const panelStyle: React.CSSProperties = {
  width: 'min(560px, calc(100vw - 2rem))',
  border: '1px solid rgba(159, 216, 255, 0.24)',
  borderRadius: 24,
  padding: 24,
  background: 'linear-gradient(180deg, rgba(8, 14, 30, 0.96), rgba(11, 20, 39, 0.98))',
  color: '#f8fbff',
  boxShadow: '0 28px 80px rgba(0, 0, 0, 0.55)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 16,
}

const eyebrowStyle: React.CSSProperties = {
  margin: '0 0 4px',
  color: '#32d6a5',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.4rem',
}

const closeStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f8fbff',
}

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 16,
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '0.45rem 0.8rem',
  background: 'rgba(50, 214, 165, 0.12)',
  border: '1px solid rgba(50, 214, 165, 0.18)',
  color: '#9ff2dd',
  fontSize: 12,
  fontWeight: 700,
}

const feeStyle: React.CSSProperties = {
  color: '#c8d4e6',
  fontSize: 13,
  fontWeight: 700,
}

const detailListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginBottom: 18,
}

const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  borderRadius: 14,
  padding: '0.8rem 1rem',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
}

const detailLabelStyle: React.CSSProperties = {
  color: '#8ea0b9',
  fontSize: 13,
}

const detailValueStyle: React.CSSProperties = {
  color: '#f8fbff',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'right',
  wordBreak: 'break-word',
}

const errorBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  borderRadius: 14,
  padding: '0.8rem 1rem',
  background: 'rgba(255, 99, 132, 0.12)',
  border: '1px solid rgba(255, 99, 132, 0.24)',
  color: '#ffc7d2',
  fontSize: 13,
}

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
}

const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f8fbff',
  fontWeight: 700,
  padding: '0.75rem 1rem',
  minWidth: 120,
}

const primaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: 'none',
  background: '#32d6a5',
  color: '#07111f',
  fontWeight: 800,
  padding: '0.75rem 1rem',
  minWidth: 140,
}
