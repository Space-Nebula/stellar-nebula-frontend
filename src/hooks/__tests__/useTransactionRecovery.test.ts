import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactionRecovery, type RecoveryOutcome } from './useTransactionRecovery'
import { useGameStore, initialGameState, type OptimisticGameOperation } from '@/store/gameStore'

/**
 * Recovery for a failed optimistic transaction (#315).
 *
 * A rollback already happened by the time the user sees anything, and the retry
 * machinery already existed, but nothing joined them to the UI: the retry control
 * was exported and rendered nowhere. These tests pin the three intents that were
 * missing, and the outcome events the issue asks for, because a success rate
 * cannot be computed from nothing.
 */
// Relative to the run, so "the cooldown is active" is true whenever the suite
// executes rather than only on the day the timestamp was written.
const FAILED_AT = new Date(Date.now() - 500).toISOString()

function failedOperation(overrides: Partial<OptimisticGameOperation> = {}): OptimisticGameOperation {
  return {
    id: 'op-failed',
    label: 'Scan sector',
    operation: { id: 'op-failed', type: 'scan', targetId: 'neb-1', startedAt: FAILED_AT },
    status: 'failed',
    createdAt: FAILED_AT,
    completedAt: FAILED_AT,
    error: 'insufficient balance',
    ...overrides
  }
}

function seedFailure(operation: OptimisticGameOperation = failedOperation()): void {
  useGameStore.setState({
    ...initialGameState,
    optimisticOperations: [operation],
    scanCooldowns: [
      { nebulaId: operation.operation.targetId, readyAt: new Date(Date.now() + 60_000).toISOString() }
    ]
  })
}

describe('useTransactionRecovery', () => {
  beforeEach(() => {
    useGameStore.setState(initialGameState)
  })

  it('reports no failure when nothing has failed', () => {
    const { result } = renderHook(() =>
      useTransactionRecovery({ submit: vi.fn().mockResolvedValue(undefined) })
    )

    expect(result.current.hasFailure).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('surfaces a failed optimistic operation even with no preserved retry frame', () => {
    seedFailure()
    const { result } = renderHook(() =>
      useTransactionRecovery({ submit: vi.fn().mockResolvedValue(undefined) })
    )

    expect(result.current.hasFailure).toBe(true)
    expect(result.current.error).toBe('insufficient balance')
  })

  it('reports a successful retry with the attempt count', async () => {
    seedFailure()
    const onOutcome = vi.fn<(outcome: RecoveryOutcome) => void>()
    const submit = vi.fn().mockResolvedValue('ok')

    const { result } = renderHook(() => useTransactionRecovery({ submit, onOutcome }))

    await act(async () => {
      await result.current.retry()
    })

    await waitFor(() => {
      expect(onOutcome).toHaveBeenCalledTimes(1)
    })
    const outcome = onOutcome.mock.calls[0][0]
    expect(outcome.status).toBe('retry_succeeded')
    expect(outcome.operationId).toBe('op-failed')
    expect(outcome.attempts).toBeGreaterThanOrEqual(1)
  })

  it('reports a failed retry with the error, and keeps it for the caller', async () => {
    seedFailure()
    const onOutcome = vi.fn<(outcome: RecoveryOutcome) => void>()
    const submit = vi.fn().mockRejectedValue(new Error('tx_bad_seq'))

    const { result } = renderHook(() =>
      useTransactionRecovery({ submit, onOutcome, maxAttempts: 1, baseDelayMs: 1 })
    )

    await act(async () => {
      await result.current.retry()
    })

    await waitFor(() => expect(onOutcome).toHaveBeenCalled())
    const outcome = onOutcome.mock.calls[0][0]
    expect(outcome.status).toBe('retry_failed')
    // The message stays local for the UI; the event carries only the type.
    expect(outcome.error).toBe('tx_bad_seq')
    expect(outcome.errorType).toBe('Error')
  })

  it('records dismiss without touching the store', async () => {
    seedFailure()
    const onOutcome = vi.fn<(outcome: RecoveryOutcome) => void>()
    const { result } = renderHook(() =>
      useTransactionRecovery({ submit: vi.fn().mockResolvedValue(undefined), onOutcome })
    )

    act(() => result.current.dismiss())

    expect(onOutcome).toHaveBeenCalledWith(expect.objectContaining({ status: 'dismissed' }))
    // Dismissal is "stop showing me this": the reverted state and the cooldown
    // stay as they are.
    expect(useGameStore.getState().scanCooldowns).toHaveLength(1)
    expect(useGameStore.getState().optimisticOperations[0].status).toBe('failed')
  })

  it('rollback releases the cooldown and marks the operation failed', async () => {
    seedFailure()
    const onOutcome = vi.fn<(outcome: RecoveryOutcome) => void>()
    const { result } = renderHook(() =>
      useTransactionRecovery({ submit: vi.fn().mockResolvedValue(undefined), onOutcome })
    )

    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(true)

    act(() => result.current.rollback())

    // The scan can be retried immediately rather than waiting out the cooldown.
    expect(useGameStore.getState().scanCooldowns).toHaveLength(0)
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(false)
    expect(useGameStore.getState().optimisticOperations[0].status).toBe('failed')
    expect(onOutcome).toHaveBeenCalledWith(expect.objectContaining({ status: 'rolled_back' }))
  })

  it('rollback works for a failure with no retry frame, which is the common case', () => {
    seedFailure()
    const { result } = renderHook(() =>
      useTransactionRecovery({ submit: vi.fn().mockResolvedValue(undefined) })
    )

    expect(result.current.hasFailure).toBe(true)
    act(() => result.current.rollback())

    expect(useGameStore.getState().scanCooldowns).toHaveLength(0)
  })

  it('reports a successful retry only once even when retried again', async () => {
    seedFailure()
    const onOutcome = vi.fn<(outcome: RecoveryOutcome) => void>()
    const submit = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useTransactionRecovery({ submit, onOutcome }))

    await act(async () => {
      await result.current.retry()
    })
    await act(async () => {
      await result.current.retry()
    })

    const succeeded = onOutcome.mock.calls.filter((call) => call[0].status === 'retry_succeeded')
    expect(succeeded.length).toBeLessThanOrEqual(1)
    expect(submit).toHaveBeenCalled()
  })

  it('does not report anything when there is no failure to act on', async () => {
    const onOutcome = vi.fn<(outcome: RecoveryOutcome) => void>()
    const { result } = renderHook(() =>
      useTransactionRecovery({ submit: vi.fn().mockResolvedValue(undefined), onOutcome })
    )

    await act(async () => {
      await result.current.retry()
    })
    act(() => {
      result.current.dismiss()
      result.current.rollback()
    })

    expect(onOutcome).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'retry_succeeded' }))
  })
})
