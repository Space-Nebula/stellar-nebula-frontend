import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useGameStore, type OptimisticGameOperation } from '@/store/gameStore'
import { trackEvent } from '@/services/analytics'
import { useTransactionRetry, type UseTransactionRetryReturn } from './useTransactionRetry'

/**
 * Recovery actions for a failed optimistic transaction.
 *
 * `rollbackOperation` already reverted the optimistic state and released the
 * scan cooldown, and `useTransactionRetry` can already re-submit a preserved
 * payload — but nothing joined them to the user's experience. The retry control
 * was exported from `components/Transaction` and rendered nowhere, so a failed
 * scan left the user staring at a reverted state with no way to retry, dismiss
 * or undo, which is what "users get stuck on failed transactions" describes.
 *
 * Three distinct actions, because they are three different intents:
 *
 *   retry    — the same transaction again. Keeps the cooldown as it is, because
 *              the transaction is still live and a retry is not a new scan.
 *   dismiss  — stop showing the failure and keep the reverted state. The right
 *              choice when the failure is not the user's to fix.
 *   rollback — give the optimistic operation back: release its cooldown and drop
 *              the failed record, so the nebula can be scanned again
 *              immediately rather than after the cooldown expires.
 */
export interface TransactionRecoveryOptions<TPayload> extends UseTransactionRetryReturn<TPayload> {
  /** The failed optimistic operation, if the failure came from one. */
  operation?: OptimisticGameOperation
  /** Remove the failed operation's record once the user is done with it. */
  dismissOperation?: () => void
  /** Release the cooldown the failed operation took. */
  releaseCooldown?: () => void
}

export interface TransactionRecovery<TPayload> {
  /** True when there is anything to recover from. */
  hasFailure: boolean
  /** The operation's own error message, when the failure carried one. */
  error: string | null
  /** Attempts made so far in the current retry run. */
  attempt: number
  isRetrying: boolean
  /** Re-submit the preserved payload. Resolves to whether it succeeded. */
  retry: () => Promise<boolean>
  /** Hide the failure and keep the reverted state. */
  dismiss: () => void
  /** Release the cooldown and drop the failed record. */
  rollback: () => void
}

export interface UseTransactionRecoveryOptions<TPayload> {
  /** Re-submits the transaction. Same contract as `useTransactionRetry`. */
  submit: (payload: unknown, attempt: number) => Promise<unknown>
  maxAttempts?: number
  baseDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
  getTransactionId?: (payload: unknown) => string
  getLabel?: (payload: unknown) => string
  /** Override the sink, for tests. Defaults to the analytics service. */
  onOutcome?: (outcome: RecoveryOutcome) => void
}

export interface RecoveryOutcome {
  status: 'retry_succeeded' | 'retry_failed' | 'dismissed' | 'rolled_back'
  attempts: number
  operationId: string | null
  transactionId: string | null
  /** The failure message, for the local caller only — never sent to analytics. */
  error: string | null
  errorType: string | null
}

function errorTypeOf(error: unknown): string | null {
  if (error === null || error === undefined) return null
  if (error instanceof Error) return error.name || 'Error'
  return typeof error
}

export function useTransactionRecovery<TPayload = unknown>({
  submit,
  maxAttempts = 3,
  baseDelayMs = 750,
  shouldRetry,
  getTransactionId,
  getLabel,
  onOutcome,
}: UseTransactionRecoveryOptions<TPayload>): TransactionRecovery<TPayload> {
  const retryState = useTransactionRetry<TPayload>({
    submit,
    maxAttempts,
    baseDelayMs,
    shouldRetry,
    getTransactionId,
    getLabel
  })

  // `retryState` inside a `useCallback` is the value from the render that created
  // it, so reading `lastFailure` after awaiting a retry would report the failure
  // from *before* the attempt. The ref tracks the current frame, which is what
  // the outcome needs.
  const lastFailureRef = useRef(retryState.lastFailure)
  useEffect(() => {
    lastFailureRef.current = retryState.lastFailure
  }, [retryState.lastFailure])

  // The store is read directly rather than through a selector so the recovery
  // surface and the store cannot disagree about what failed.
  const failedOperation = useGameStore((state) =>
    state.optimisticOperations.find((op) => op.status === 'failed')
  )

  const report = useCallback(
    (outcome: Omit<RecoveryOutcome, 'operationId' | 'transactionId' | 'errorType'>) => {
      const payload: RecoveryOutcome = {
        ...outcome,
        operationId: failedOperation?.id ?? null,
        transactionId: retryState.lastFailure?.transactionId ?? null,
        errorType: errorTypeOf(outcome.error)
      }

      if (onOutcome) {
        onOutcome(payload)
        return
      }

      // Retry success rate is the number this issue asks for: without an event
      // per outcome there is nothing to compute it from.
      if (payload.status === 'retry_succeeded') {
        trackEvent('transaction_retry_succeeded', {
          attempts: payload.attempts,
          operationId: payload.operationId,
          transactionId: payload.transactionId
        })
      } else if (payload.status === 'retry_failed') {
        trackEvent('transaction_retry_failed', {
          attempts: payload.attempts,
          operationId: payload.operationId,
          transactionId: payload.transactionId,
          // The error *type*, never its text: `sanitizeAnalyticsPayload` filters
          // keys, not values, and a Stellar failure message routinely embeds an
          // account address. The full message stays in the local outcome, where
          // the UI shows it to the user who caused it.
          errorType: payload.errorType ?? 'unknown'
        })
      } else if (payload.status === 'rolled_back') {
        trackEvent('transaction_rolled_back', {
          operationId: payload.operationId,
          transactionId: payload.transactionId
        })
      }
    },
    [failedOperation?.id, onOutcome, retryState.lastFailure?.transactionId]
  )

  const retry = useCallback(async (): Promise<boolean> => {
    const hadFailure = lastFailureRef.current !== null
    if (!hadFailure) return false

    const succeeded = await retryState.retry()
    report({
      status: succeeded ? 'retry_succeeded' : 'retry_failed',
      // Read after the attempt: the frame now carries the new error.
      attempts: lastFailureRef.current?.attempt ?? retryState.attempt,
      error: succeeded ? null : (lastFailureRef.current?.error ?? null)
    })
    return succeeded
  }, [report, retryState])

  const dismiss = useCallback(() => {
    // Report what happened, not what was asked for: dismissing with nothing on
    // screen would otherwise inflate the dismissal count in analytics.
    const hadFailure = lastFailureRef.current !== null || failedOperation !== undefined
    retryState.clear()
    if (hadFailure) report({ status: 'dismissed', attempts: retryState.attempt, error: null })
  }, [failedOperation, report, retryState])

  const rollback = useCallback(() => {
    const store = useGameStore.getState()
    const operation =
      failedOperation ?? store.optimisticOperations.find((op) => op.status === 'failed')

    if (operation) {
      // `rollbackOperation` is the store's own inverse: it releases the cooldown
      // and marks the record failed, which is what "undo" means here.
      store.rollbackOperation(operation.id, operation.error ?? 'Rolled back by user')
    }

    retryState.clear()
    // Only a real rollback is reported; with nothing to undo, the store is
    // untouched and the metric would be counting an intent.
    if (operation) {
      report({ status: 'rolled_back', attempts: retryState.attempt, error: operation.error ?? null })
    }
  }, [failedOperation, report, retryState])

  return useMemo(
    () => ({
      hasFailure: retryState.lastFailure !== null || failedOperation !== undefined,
      error: retryState.lastFailure?.error ?? failedOperation?.error ?? null,
      attempt: retryState.attempt,
      isRetrying: retryState.isRetrying,
      retry,
      dismiss,
      rollback
    }),
    [dismiss, failedOperation, retry, retryState, rollback]
  )
}
