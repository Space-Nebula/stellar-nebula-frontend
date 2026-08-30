import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isRetryableStellarError } from '@/utils/stellar/retry'

export interface TransactionRetryFrame<TPayload> {
  transactionId: string
  payload: TPayload
  label: string
  error: string
  attempt: number
}

export interface TransactionRetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
  getTransactionId?: (payload: unknown) => string
  getLabel?: (payload: unknown) => string
  submit: (payload: unknown, attempt: number) => Promise<unknown>
}

export interface UseTransactionRetryReturn<TPayload> {
  /** The most recent failure, preserved so the UI can offer a Retry button. */
  lastFailure: TransactionRetryFrame<TPayload> | null
  attempt: number
  isRetrying: boolean
  /** Re-submits the preserved payload with exponential backoff + max attempts. */
  retry: () => Promise<boolean>
  clear: () => void
  /** Records a failed submission so it can be retried without re-entering the form. */
  recordFailure: (payload: TPayload, error: unknown, label?: string) => void
}

interface PendingRetry<TPayload> {
  transactionId: string
  payload: TPayload
  label: string
  error: unknown
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Wrap a transaction submission in exponential-backoff retry with a hard cap,
 * preserving the original payload so a "Retry" button can re-submit the exact
 * same transaction without the user re-entering the form.
 *
 * @example
 * const tx = useTransactionRetry({
 *   maxAttempts: 3,
 *   submit: async (payload, attempt) => rpcServer.sendTransaction(payload),
 * })
 * tx.retry()
 */
export function useTransactionRetry<TPayload = unknown>({
  maxAttempts = 3,
  baseDelayMs = 750,
  shouldRetry = isRetryableStellarError,
  getTransactionId = () => `tx-${Date.now()}`,
  getLabel = (payload) => (payload && typeof payload === 'object' ? 'transaction' : 'transaction'),
  submit,
}: TransactionRetryOptions): UseTransactionRetryReturn<TPayload> {
  const [lastFailure, setLastFailure] = useState<TransactionRetryFrame<TPayload> | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const pending = useRef<PendingRetry<TPayload> | null>(null)

  const recordFailure = useCallback(
    (payload: TPayload, error: unknown, label?: string) => {
      const transactionId = getTransactionId(payload)
      pending.current = {
        transactionId,
        payload,
        label: label ?? getLabel(payload),
        error,
      }
      setAttempt(0)
      setLastFailure({
        transactionId,
        payload,
        label: pending.current.label,
        error: messageOf(error, 'Transaction failed'),
        attempt: 0,
      })
    },
    [getLabel, getTransactionId]
  )

  const clear = useCallback(() => {
    pending.current = null
    setLastFailure(null)
    setAttempt(0)
    setIsRetrying(false)
  }, [])

  const runSingleAttempt = useCallback(
    async (payload: TPayload): Promise<{ ok: boolean; error: unknown }> => {
      try {
        await submit(payload, attempt + 1)
        return { ok: true, error: null }
      } catch (error) {
        return { ok: false, error }
      }
    },
    [attempt, submit]
  )

  const retry = useCallback(async (): Promise<boolean> => {
    const current = pending.current
    if (!current || isRetrying) return false

    setIsRetrying(true)
    try {
      const totalAttempts = Math.max(1, maxAttempts)
      let lastError: unknown = current.error

      for (let attemptIndex = 0; attemptIndex < totalAttempts; attemptIndex += 1) {
        const attemptNumber = attemptIndex + 1
        setAttempt(attemptNumber)

        const result = await runSingleAttempt(current.payload)
        if (result.ok) {
          pending.current = null
          setLastFailure(null)
          setAttempt(attemptNumber)
          return true
        }

        lastError = result.error
        const canContinue =
          attemptIndex < totalAttempts - 1 && shouldRetry(result.error)

        setLastFailure({
          transactionId: current.transactionId,
          payload: current.payload,
          label: current.label,
          error: messageOf(result.error, 'Transaction failed'),
          attempt: attemptNumber,
        })

        if (!canContinue) return false

        // Exponential backoff, e.g. 750ms -> 1.5s -> 3s, capped at 30s.
        const delay = Math.min(30_000, baseDelayMs * 2 ** attemptIndex)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      setLastFailure((prev) =>
        prev
          ? { ...prev, error: messageOf(lastError, 'Transaction failed') }
          : prev
      )
      return false
    } finally {
      setIsRetrying(false)
    }
  }, [baseDelayMs, isRetrying, maxAttempts, runSingleAttempt, shouldRetry])

  return useMemo(
    () => ({ lastFailure, attempt, isRetrying, retry, clear, recordFailure }),
    [attempt, clear, isRetrying, lastFailure, recordFailure, retry]
  )
}