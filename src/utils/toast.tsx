import toast from 'react-hot-toast'
import type { Toast, ToastOptions, ToastPosition } from 'react-hot-toast'

export type AppToastType = 'success' | 'error' | 'loading' | 'info' | 'warning'

/** Default corner for every toast. Overridable per call. */
export const TOAST_POSITION: ToastPosition = 'bottom-right'

/** Gap between stacked toasts, in px. */
export const TOAST_GUTTER = 8

/** Maximum number of visible toasts; older ones are dismissed (see AppToaster). */
export const TOAST_STACK_LIMIT = 3

/**
 * Per-type default durations in ms. `Infinity` means the toast stays until it is
 * dismissed explicitly (used for `loading`).
 */
export const TOAST_DURATION: Record<AppToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
  loading: Infinity,
}

/** Emoji icon per type; typed variants (success/error/loading) keep their built-in icons. */
const TOAST_ICON: Partial<Record<AppToastType, string>> = {
  info: 'ℹ️',
  warning: '⚠️',
}

/**
 * Accessibility: errors and warnings interrupt assistive tech, everything else
 * is announced politely.
 */
export function ariaPropsForType(type: AppToastType): Toast['ariaProps'] {
  return type === 'error' || type === 'warning'
    ? { role: 'alert', 'aria-live': 'assertive' }
    : { role: 'status', 'aria-live': 'polite' }
}

function baseOptions(type: AppToastType, overrides?: ToastOptions): ToastOptions {
  return {
    duration: TOAST_DURATION[type],
    position: TOAST_POSITION,
    ariaProps: ariaPropsForType(type),
    ...(TOAST_ICON[type] ? { icon: TOAST_ICON[type] } : {}),
    ...overrides,
  }
}

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ShowToastOptions extends ToastOptions {
  type?: AppToastType
  /** Optional action button rendered inside the toast. */
  action?: ToastAction
}

/**
 * Render a toast with an inline action button (e.g. "Undo", "View").
 * The toast is dismissed automatically once the action is triggered.
 */
function renderActionToast(t: Toast, message: string, action: ToastAction, type: AppToastType) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
      {...ariaPropsForType(type)}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={() => {
          action.onClick()
          toast.dismiss(t.id)
        }}
        style={{
          flexShrink: 0,
          borderRadius: 999,
          border: '1px solid rgba(159, 216, 255, 0.4)',
          background: 'transparent',
          color: '#9fd8ff',
          fontWeight: 700,
          fontSize: 12,
          padding: '4px 10px',
          cursor: 'pointer',
        }}
      >
        {action.label}
      </button>
    </div>
  )
}

/**
 * Central entry point for toasts. Applies the per-type duration, position and
 * ARIA props, and supports an optional action button.
 *
 * @example
 * showToast('Trade submitted', { type: 'success' })
 * showToast('Order cancelled', { type: 'info', action: { label: 'Undo', onClick: undo } })
 */
export function showToast(message: string, options: ShowToastOptions = {}): string {
  const { type = 'info', action, ...rest } = options
  const opts = baseOptions(type, rest)

  if (action) {
    return toast.custom((t) => renderActionToast(t, message, action, type), opts)
  }

  switch (type) {
    case 'success':
      return toast.success(message, opts)
    case 'error':
      return toast.error(message, opts)
    case 'loading':
      return toast.loading(message, opts)
    default:
      return toast(message, opts)
  }
}

/**
 * Show a success toast notification.
 *
 * @example
 * showSuccess('Transaction confirmed')
 */
export function showSuccess(message: string, options?: ToastOptions): string {
  return toast.success(message, baseOptions('success', options))
}

/**
 * Show an error toast notification.
 *
 * @example
 * showError('Failed to connect wallet')
 */
export function showError(message: string, options?: ToastOptions): string {
  return toast.error(message, baseOptions('error', options))
}

/**
 * Show a loading toast notification.
 *
 * @example
 * const id = showLoading('Processing...')
 */
export function showLoading(message: string, options?: ToastOptions): string {
  return toast.loading(message, baseOptions('loading', options))
}

/** Show an informational toast notification. */
export function showInfo(message: string, options?: ToastOptions): string {
  return toast(message, baseOptions('info', options))
}

/** Show a warning toast notification. */
export function showWarning(message: string, options?: ToastOptions): string {
  return toast(message, baseOptions('warning', options))
}

/** Dismiss a specific toast by ID, or all toasts if no ID is provided. */
export function dismissToast(toastId?: string): void {
  toast.dismiss(toastId)
}

/**
 * Update an existing toast with new content.
 *
 * @example
 * updateToast(loadingId, { message: 'Done!', type: 'success' })
 */
export function updateToast(
  toastId: string,
  options: Partial<Pick<Toast, 'message' | 'type'>> & ToastOptions
): void {
  toast(toastId, { position: TOAST_POSITION, ...options })
}

export { toast }
