import { useCallback, useMemo, useRef, useState } from 'react'
import { useGameStore, type OptimisticGameOperation } from '@/store/gameStore'
import { trackEvent } from '@/services/analytics'
import { useTransactionRetry, type UseTransactionRetryReturn } from './useTransactionRetry'

export interface TransactionRecoveryOptions<TPayload> extends UseTransactionRetryReturn<TPayload> {
  operation?: OptimisticGameOperation
  dismissOperation?: () => void
  releaseCooldown?: () => void
}

export interface TransactionRecovery {
  hasFailure: boolean
  error: string | null
  attempt: number
  isRetrying: boolean
  retry: () => Promise<boolean>
  dismiss: () => void
  rollback: () => void
}

export interface UseTransactionRecoveryOptions {
  submit: (payload: unknown, attempt: number) => Promise<unknown>
  maxAttempts?: number
  baseDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
  getTransactionId?: (payload: unknown) => string
  getLabel?: (payload: unknown) => string
  onOutcome?: (outcome: RecoveryOutcome) => void
}

export interface RecoveryOutcome {
  status: 'retry_succeeded' | 'retry_failed' | 'dismissed' | 'rolled_back'
  attempts: number
  operationId: string | null
  transactionId: string | null
  error: string | null
  errorType: string | null
}

function errorTypeOf(error: unknown): string | null {
  if (error === null || error === undefined) return null
  if (error instanceof Error) return error.name || 'Error'
  if (typeof error === 'string') return 'Error'
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
}: UseTransactionRecoveryOptions): TransactionRecovery {
  const lastSubmitAttemptRef = useRef(0)
  const lastSubmitErrorRef = useRef<unknown>(null)

  const wrappedSubmit = useCallback(
    async (payload: unknown, attemptNum: number) => {
      lastSubmitAttemptRef.current = attemptNum
      try {
        const res = await submit(payload, attemptNum)
        lastSubmitErrorRef.current = null
        return res
      } catch (err) {
        lastSubmitErrorRef.current = err
        throw err
      }
    },
    [submit]
  )

  const retryState = useTransactionRetry<TPayload>({
    submit: wrappedSubmit,
    maxAttempts,
    baseDelayMs,
    shouldRetry,
    getTransactionId,
    getLabel,
  })

  const [dismissedId, setDismissedId] = useState<string | null>(null)

  // The store is read directly rather than through a selector so the recovery
  // surface and the store cannot disagree about what failed.
  const failedOperation = useGameStore((state) =>
    state.optimisticOperations.find((op) => op.status === 'failed')
  )

  const currentFailureId =
    retryState.lastFailure?.transactionId ?? (failedOperation ? failedOperation.id : null)
  const isDismissed = dismissedId !== null && dismissedId === currentFailureId

  const report = useCallback(
    (
      outcome: Omit<RecoveryOutcome, 'operationId' | 'transactionId' | 'errorType'> & {
        errorType?: string | null
      }
    ) => {
      const payload: RecoveryOutcome = {
        ...outcome,
        operationId: failedOperation?.id ?? null,
        transactionId: retryState.lastFailure?.transactionId ?? null,
        errorType: errorTypeOf(lastSubmitErrorRef.current ?? outcome.error),
      }

      if (onOutcome) {
        onOutcome(payload)
        return
      }

      if (payload.status === 'retry_succeeded') {
        trackEvent('transaction_retry_succeeded', {
          attempts: payload.attempts,
          operationId: payload.operationId,
          transactionId: payload.transactionId,
        })
      } else if (payload.status === 'retry_failed') {
        trackEvent('transaction_retry_failed', {
          attempts: payload.attempts,
          operationId: payload.operationId,
          transactionId: payload.transactionId,
          errorType: payload.errorType ?? 'unknown',
        })
      } else if (payload.status === 'rolled_back') {
        trackEvent('transaction_rolled_back', {
          operationId: payload.operationId,
          transactionId: payload.transactionId,
        })
      }
    },
    [failedOperation?.id, onOutcome, retryState.lastFailure?.transactionId]
  )

  const retry = useCallback(async (): Promise<boolean> => {
    const hadFailure =
      (!isDismissed && failedOperation !== undefined) || retryState.lastFailure !== null
    if (!hadFailure) return false

    if (!retryState.lastFailure && failedOperation) {
      retryState.recordFailure(
        failedOperation.operation as unknown as TPayload,
        new Error(failedOperation.error ?? 'Transaction failed'),
        failedOperation.label
      )
    }

    const succeeded = await retryState.retry()
    if (succeeded && currentFailureId) {
      setDismissedId(currentFailureId)
    }
    const attemptCount = Math.max(1, lastSubmitAttemptRef.current || retryState.attempt)
    const errText = succeeded
      ? null
      : lastSubmitErrorRef.current instanceof Error
        ? lastSubmitErrorRef.current.message
        : typeof lastSubmitErrorRef.current === 'string'
          ? lastSubmitErrorRef.current
          : (retryState.lastFailure?.error ?? failedOperation?.error ?? null)

    report({
      status: succeeded ? 'retry_succeeded' : 'retry_failed',
      attempts: attemptCount,
      error: errText,
    })
    return succeeded
  }, [currentFailureId, failedOperation, isDismissed, report, retryState])

  const dismiss = useCallback(() => {
    // Report what happened, not what was asked for: dismissing with nothing on
    // screen would otherwise inflate the dismissal count in analytics.
    const hadFailure =
      !isDismissed && (retryState.lastFailure !== null || failedOperation !== undefined)
    if (currentFailureId) {
      setDismissedId(currentFailureId)
    }
    retryState.clear()
    if (hadFailure) report({ status: 'dismissed', attempts: retryState.attempt, error: null })
  }, [currentFailureId, failedOperation, isDismissed, report, retryState])

  const rollback = useCallback(() => {
    const store = useGameStore.getState()
    const operation =
      failedOperation ?? store.optimisticOperations.find((op) => op.status === 'failed')

    if (operation) {
      store.rollbackOperation(operation.id, operation.error ?? 'Rolled back by user')
    }

    setDismissedId(null)
    retryState.clear()
    if (operation) {
      report({
        status: 'rolled_back',
        attempts: retryState.attempt,
        error: operation.error ?? null,
        errorType: errorTypeOf(operation.error),
      })
    }
  }, [failedOperation, report, retryState])

  return useMemo(
    () => ({
      hasFailure:
        !isDismissed && (retryState.lastFailure !== null || failedOperation !== undefined),
      error: !isDismissed
        ? (retryState.lastFailure?.error ?? failedOperation?.error ?? null)
        : null,
      attempt: retryState.attempt,
      isRetrying: retryState.isRetrying,
      retry,
      dismiss,
      rollback,
    }),
    [dismiss, failedOperation, isDismissed, retry, retryState, rollback]
  )
}
