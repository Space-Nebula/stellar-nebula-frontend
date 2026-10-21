import { useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { TransactionToast } from '@/components/TransactionToast'
import { TOAST_DURATION, ariaPropsForType } from '@utils/toast'
import { getErrorMessage } from '@utils/error-messages'
import type { StellarNetwork } from '@/types'

export interface TransactionToastOptions {
  /** Override the headline (defaults depend on success/failure). */
  message?: string
  /** Network used to build the explorer link. */
  network?: StellarNetwork
}

export interface UseTransactionToastReturn {
  /** Show/replace the in-progress toast and return its id. */
  showPending: (message?: string) => string
  /** Replace the in-progress toast with a success toast + explorer link. */
  showSuccess: (hash: string | null, options?: TransactionToastOptions) => string
  /** Replace the in-progress toast with an accessible failure toast. */
  showError: (error: unknown, options?: TransactionToastOptions) => string
  /** Dismiss the transaction toast this hook currently owns. */
  dismiss: () => void
}

/**
 * Transaction confirmation notifications (#457).
 *
 * A single toast id is tracked so a pending toast is always replaced by its
 * final state instead of stacking. Success toasts link to Stellar Expert;
 * failures are announced assertively and carry the actionable message from the
 * error utilities.
 *
 * @example
 * const txToast = useTransactionToast(walletState.network ?? 'testnet')
 * txToast.showPending('Submitting upgrade…')
 * txToast.showSuccess(hash, { message: 'Upgrade confirmed' })
 * txToast.showError(err, { message: 'Upgrade failed' })
 */
export function useTransactionToast(
  defaultNetwork: StellarNetwork = 'testnet'
): UseTransactionToastReturn {
  const activeIdRef = useRef<string | null>(null)

  const dismiss = useCallback(() => {
    if (activeIdRef.current) {
      toast.dismiss(activeIdRef.current)
      activeIdRef.current = null
    }
  }, [])

  const renderFinalToast = useCallback(
    (
      status: 'success' | 'error',
      message: string,
      hash: string | null,
      network: StellarNetwork
    ): string => {
      dismiss()

      const id = toast.custom(
        (t) => (
          <TransactionToast
            status={status}
            message={message}
            hash={hash}
            network={network}
            onDismiss={() => toast.dismiss(t.id)}
          />
        ),
        {
          duration: status === 'success' ? TOAST_DURATION.success : TOAST_DURATION.error,
          ariaProps: ariaPropsForType(status === 'success' ? 'success' : 'error'),
        }
      )

      activeIdRef.current = id
      return id
    },
    [dismiss]
  )

  const showPending = useCallback(
    (message = 'Submitting transaction…'): string => {
      dismiss()
      const id = toast.loading(message, { duration: TOAST_DURATION.loading })
      activeIdRef.current = id
      return id
    },
    [dismiss]
  )

  const showSuccess = useCallback(
    (hash: string | null, options: TransactionToastOptions = {}): string =>
      renderFinalToast(
        'success',
        options.message ?? 'Transaction confirmed',
        hash,
        options.network ?? defaultNetwork
      ),
    [defaultNetwork, renderFinalToast]
  )

  const showError = useCallback(
    (error: unknown, options: TransactionToastOptions = {}): string =>
      renderFinalToast(
        'error',
        options.message ?? getErrorMessage(error, 'Transaction failed'),
        null,
        options.network ?? defaultNetwork
      ),
    [defaultNetwork, renderFinalToast]
  )

  return { showPending, showSuccess, showError, dismiss }
}
