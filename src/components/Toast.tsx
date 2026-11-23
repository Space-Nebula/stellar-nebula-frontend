import React from 'react'
import toast, { type Toast as HotToast } from 'react-hot-toast'
import { parseStellarError, type ParsedStellarError, type StellarErrorType } from '@/utils/stellar-errors'

export type DistinctToastType =
  | 'network'
  | 'user'
  | 'insufficient_funds'
  | 'bad_seq'
  | 'timeout'
  | 'error'
  | 'warning'
  | 'success'
  | 'info'

export interface ToastProps {
  id?: string
  type: DistinctToastType
  title: string
  message: string
  recoveryStep?: string
  learnMoreUrl?: string
  onClose?: () => void
}

const TOAST_ICONS: Record<DistinctToastType, string> = {
  network: '🌐',
  user: '👤',
  insufficient_funds: '💰',
  bad_seq: '🔄',
  timeout: '⏱️',
  error: '❌',
  warning: '⚠️',
  success: '✅',
  info: 'ℹ️',
}

const TOAST_THEMES: Record<DistinctToastType, { border: string; bg: string; titleColor: string }> = {
  network: { border: 'border-blue-500/60', bg: 'bg-space-900', titleColor: 'text-blue-400' },
  user: { border: 'border-amber-500/60', bg: 'bg-space-900', titleColor: 'text-amber-400' },
  insufficient_funds: { border: 'border-rose-500/60', bg: 'bg-space-900', titleColor: 'text-rose-400' },
  bad_seq: { border: 'border-purple-500/60', bg: 'bg-space-900', titleColor: 'text-purple-400' },
  timeout: { border: 'border-orange-500/60', bg: 'bg-space-900', titleColor: 'text-orange-400' },
  error: { border: 'border-rose-600/60', bg: 'bg-space-900', titleColor: 'text-rose-400' },
  warning: { border: 'border-amber-500/60', bg: 'bg-space-900', titleColor: 'text-amber-400' },
  success: { border: 'border-emerald-500/60', bg: 'bg-space-900', titleColor: 'text-emerald-400' },
  info: { border: 'border-cyan-500/60', bg: 'bg-space-900', titleColor: 'text-cyan-400' },
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  recoveryStep,
  learnMoreUrl,
  onClose,
}) => {
  const icon = TOAST_ICONS[type] || '⚠️'
  const theme = TOAST_THEMES[type] || TOAST_THEMES.error

  const handleDismiss = () => {
    if (onClose) onClose()
    if (id) toast.dismiss(id)
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`toast-container flex items-start gap-3 p-4 rounded-xl border ${theme.border} ${theme.bg} text-white shadow-2xl max-w-md w-full backdrop-blur-md`}
      data-testid={`toast-${type}`}
    >
      <div className="text-2xl select-none" aria-hidden="true">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-bold ${theme.titleColor} mb-1`} data-testid="toast-title">
          {title}
        </h4>
        <p className="text-xs text-gray-200 leading-relaxed mb-2" data-testid="toast-message">
          {message}
        </p>

        {recoveryStep && (
          <div className="text-xs bg-space-800/80 rounded p-2 mb-2 border border-space-700 text-gray-300">
            <strong className="text-gray-100 font-semibold">Action: </strong>
            <span data-testid="toast-recovery-step">{recoveryStep}</span>
          </div>
        )}

        {learnMoreUrl && (
          <a
            href={learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-dark-link hover:underline font-semibold inline-flex items-center gap-1"
            data-testid="toast-learn-more"
          >
            <span>Learn More</span>
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="text-gray-400 hover:text-white p-1 rounded transition text-sm"
      >
        ✕
      </button>
    </div>
  )
}

/**
 * Display a user-friendly toast for a Stellar error.
 */
export function showStellarErrorToast(
  error: unknown,
  context?: { estimatedFeeXlm?: string }
): string {
  const parsed: ParsedStellarError = parseStellarError(error, context)

  let toastType: DistinctToastType = 'error'
  if (parsed.type === 'network') toastType = 'network'
  else if (parsed.type === 'insufficient_funds') toastType = 'insufficient_funds'
  else if (parsed.type === 'bad_seq') toastType = 'bad_seq'
  else if (parsed.type === 'timeout') toastType = 'timeout'
  else if (parsed.type === 'user') toastType = 'user'

  return toast.custom(
    (t: HotToast) => (
      <Toast
        id={t.id}
        type={toastType}
        title={parsed.title}
        message={parsed.message}
        recoveryStep={parsed.recoveryStep}
        learnMoreUrl={parsed.learnMoreUrl}
        onClose={() => toast.dismiss(t.id)}
      />
    ),
    {
      duration: 8000,
      position: 'bottom-right',
    }
  )
}

export default Toast
