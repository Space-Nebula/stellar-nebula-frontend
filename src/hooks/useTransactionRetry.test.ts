import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTransactionRetry } from './useTransactionRetry'

describe('useTransactionRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  function makeHook(mockSubmit: ReturnType<typeof vi.fn>) {
    return renderHook(() =>
      useTransactionRetry<string>({
        maxAttempts: 3,
        baseDelayMs: 1000,
        getTransactionId: () => 'tx-abc123',
        submit: mockSubmit as unknown as (payload: unknown, attempt: number) => Promise<unknown>,
      })
    )
  }

  it('records a failure so it can be retried', () => {
    const submit = vi.fn()
    const { result } = makeHook(submit)

    act(() => result.current.recordFailure('x', new Error('Network timeout'), 'Upgrade engine'))

    expect(result.current.lastFailure).toMatchObject({
      transactionId: 'tx-abc123',
      label: 'Upgrade engine',
      error: 'Network timeout',
      attempt: 0,
    })
  })

  it('retries a transient failure and succeeds', async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValueOnce('tx-hash')

    const { result } = makeHook(submit)
    act(() => result.current.recordFailure('x', new Error('Network timeout')))

    let succeeded = false
    act(() => {
      void result.current.retry().then((ok) => {
        succeeded = ok
      })
    })
    // Flush the two backoff sleeps (1000ms, 2000ms).
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(submit).toHaveBeenCalledTimes(3)
    expect(result.current.lastFailure).toBeNull()
    expect(succeeded).toBe(true)
  })

  it('does not retry user cancellations and preserves the failure frame', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('User rejected signing'))

    const { result } = makeHook(submit)
    act(() => result.current.recordFailure('x', new Error('User rejected signing')))

    let succeeded = true
    act(() => {
      void result.current.retry().then((ok) => {
        succeeded = ok
      })
    })
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(submit).toHaveBeenCalledTimes(1)
    expect(succeeded).toBe(false)
    expect(result.current.lastFailure?.error).toBe('User rejected signing')
  })

  it('gives up after the max attempt limit', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('503 Service Temporarily Unavailable'))

    const { result } = makeHook(submit)
    act(() => result.current.recordFailure('x', new Error('503 Service Temporarily Unavailable')))

    let succeeded = true
    act(() => {
      void result.current.retry().then((ok) => {
        succeeded = ok
      })
    })
    // Three attempts: 1000ms + 2000ms sleep between them.
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })

    expect(submit).toHaveBeenCalledTimes(3)
    expect(succeeded).toBe(false)
    expect(result.current.lastFailure?.attempt).toBe(3)
  })

  it('clear() resets the preserved failure', () => {
    const submit = vi.fn()
    const { result } = makeHook(submit)
    act(() => result.current.recordFailure('x', new Error('boom')))
    expect(result.current.lastFailure).not.toBeNull()

    act(() => result.current.clear())
    expect(result.current.lastFailure).toBeNull()
    expect(result.current.attempt).toBe(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
