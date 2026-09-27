import { TransactionRetryButton } from './TransactionRetryButton'
import type { TransactionRetryFrame } from '@/hooks/useTransactionRetry'
import type { TransactionRecovery } from '@/hooks/useTransactionRecovery'

export interface TransactionRecoveryPanelProps<TPayload> {
  recovery: TransactionRecovery<TPayload>
  /** Preserved failure, when one exists to re-submit. */
  failure?: TransactionRetryFrame<TPayload> | null
  maxAttempts?: number
  /** Hide the manual rollback control, e.g. when the caller has none. */
  canRollback?: boolean
}

/**
 * Recovery surface for a failed transaction: retry the same transaction, dismiss
 * the message, or roll the optimistic operation back by hand.
 *
 * This is the piece the app was missing. `rollbackOperation` reverted the state
 * and `useTransactionRetry` could re-submit the payload, but the retry control
 * was exported and rendered nowhere, so a failed scan left the player with a
 * reverted state and no way forward. All three actions are offered because they
 * are three different intents, and the copy says which is which rather than
 * leaving the player to guess:
 *
 *   Retry    — try the same transaction again
 *   Dismiss  — I do not want to deal with this; keep the reverted state
 *   Rollback — give back the scan this attempt took, so I can retry it now
 *
 * The error text is rendered inside an `alert`, so it is announced when it
 * appears rather than only being visible.
 */
export function TransactionRecoveryPanel<TPayload>({
  recovery,
  failure,
  maxAttempts = 3,
  canRollback = true
}: TransactionRecoveryPanelProps<TPayload>): JSX.Element | null {
  if (!recovery.hasFailure) return null

  const showRetry = failure !== null && failure !== undefined

  return (
    <section className="transaction-recovery" aria-label="Transaction recovery">
      {showRetry ? (
        <TransactionRetryButton
          failure={failure}
          isRetrying={recovery.isRetrying}
          attempt={recovery.attempt}
          maxAttempts={maxAttempts}
          onRetry={() => void recovery.retry()}
          onCancel={recovery.dismiss}
        />
      ) : (
        <div role="alert" className="transaction-recovery-message">
          <p>{recovery.error ?? 'The transaction failed.'}</p>
        </div>
      )}

      {canRollback && (
        <div className="transaction-recovery-actions">
          <button
            type="button"
            onClick={recovery.rollback}
            disabled={recovery.isRetrying}
            aria-label="Roll back the failed transaction"
          >
            Roll back and free the cooldown
          </button>
          {!showRetry && (
            <button
              type="button"
              onClick={recovery.dismiss}
              disabled={recovery.isRetrying}
              aria-label="Dismiss the transaction error"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default TransactionRecoveryPanel
