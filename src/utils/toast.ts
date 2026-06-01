import toast from 'react-hot-toast'
import type { Toast, ToastOptions } from 'react-hot-toast'

const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'bottom-right',
}

/**
 * Show a success toast notification.
 *
 * @example
 * showSuccess('Transaction confirmed')
 */
export function showSuccess(message: string, options?: ToastOptions): string {
  return toast.success(message, { ...defaultOptions, ...options })
}

/**
 * Show an error toast notification.
 *
 * @example
 * showError('Failed to connect wallet')
 */
export function showError(message: string, options?: ToastOptions): string {
  return toast.error(message, { ...defaultOptions, ...options })
}

/**
 * Show a loading toast notification.
 *
 * @example
 * const id = showLoading('Processing...')
 */
export function showLoading(message: string, options?: ToastOptions): string {
  return toast.loading(message, { ...defaultOptions, ...options })
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
  toast(toastId, { ...defaultOptions, ...options })
}
