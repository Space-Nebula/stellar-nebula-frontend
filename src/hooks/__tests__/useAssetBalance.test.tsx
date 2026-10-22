import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BalanceSnapshot, BalanceWatcher } from '@services/balance-watcher'
import type { FormattedBalance } from '@utils/horizon-utils'
import { useAssetBalance } from '../useAssetBalance'
import { createBalanceWatcher } from '@services/balance-watcher'

const watcherMocks = vi.hoisted(() => ({
  onChange: undefined as
    | ((snapshot: BalanceSnapshot, previous: BalanceSnapshot | null) => void)
    | undefined,
  onError: undefined as ((error: Error) => void) | undefined,
  refresh: vi.fn().mockResolvedValue(null),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('@services/balance-watcher', () => ({
  DEFAULT_BALANCE_POLL_INTERVAL_MS: 5_000,
  createBalanceWatcher: vi.fn(
    (options: {
      onChange?: (snapshot: BalanceSnapshot, previous: BalanceSnapshot | null) => void
      onError?: (error: Error) => void
    }) => {
      watcherMocks.onChange = options.onChange
      watcherMocks.onError = options.onError
      return {
        start: watcherMocks.start,
        stop: watcherMocks.stop,
        refresh: watcherMocks.refresh,
        isRunning: () => true,
        getSnapshot: () => null,
      } satisfies BalanceWatcher
    }
  ),
}))

const XLM: FormattedBalance = {
  assetCode: 'XLM',
  balance: '10.0000000',
  assetType: 'native',
  isNative: true,
}

const NEB: FormattedBalance = {
  assetCode: 'NEB',
  assetIssuer: 'GISSUER',
  balance: '5.0000000',
  assetType: 'credit_alphanum4',
  isNative: false,
}

function snapshot(balances = [XLM], unfunded = false): BalanceSnapshot {
  return { balances, unfunded, fetchedAt: Date.now() }
}

async function emit(snapshotValue: BalanceSnapshot, previous: BalanceSnapshot | null = null) {
  await act(async () => {
    watcherMocks.onChange?.(snapshotValue, previous)
  })
}

describe('useAssetBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    watcherMocks.onChange = undefined
    watcherMocks.onError = undefined
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts polling for the connected account', () => {
    const { result } = renderHook(() => useAssetBalance('GTEST'))

    expect(watcherMocks.start).toHaveBeenCalled()
    expect(result.current.isPolling).toBe(true)
    expect(result.current.isLoading).toBe(true)
  })

  it('does not create a watcher without an account', () => {
    const { result } = renderHook(() => useAssetBalance(null))

    expect(createBalanceWatcher).not.toHaveBeenCalled()
    expect(result.current.isPolling).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.balances).toEqual([])
  })

  it('publishes balances and clears the initial loading state on the first poll', async () => {
    const { result } = renderHook(() => useAssetBalance('GTEST'))

    await emit(snapshot())

    expect(result.current.balances).toEqual([XLM])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.lastUpdated).toBeTypeOf('number')
    expect(result.current.error).toBeNull()
  })

  it('paints cached balances before Horizon answers', () => {
    localStorage.setItem('stellar-nebula:balance-cache:GCACHED', JSON.stringify([XLM]))

    const { result } = renderHook(() => useAssetBalance('GCACHED'))

    expect(result.current.balances).toEqual([XLM])
  })

  it('highlights changed balances and clears the highlight', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useAssetBalance('GTEST'))

    await emit(snapshot())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(result.current.balanceChanged).toBe(false)

    await emit(snapshot([{ ...XLM, balance: '20.0000000' }, NEB]), snapshot())

    expect(result.current.balanceChanged).toBe(true)
    expect(result.current.balances).toHaveLength(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(result.current.balanceChanged).toBe(false)
  })

  it('shows the unfunded state and clears balances', async () => {
    const { result } = renderHook(() => useAssetBalance('GTEST'))

    await emit(snapshot([], true))

    expect(result.current.isUnfunded).toBe(true)
    expect(result.current.balances).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('surfaces polling errors', async () => {
    const { result } = renderHook(() => useAssetBalance('GTEST'))

    await act(async () => {
      watcherMocks.onError?.(new Error('Horizon unavailable'))
    })

    expect(result.current.error).toBe('Horizon unavailable')
  })

  it('refreshes immediately on demand', async () => {
    const { result } = renderHook(() => useAssetBalance('GTEST'))

    await act(async () => {
      await result.current.refresh()
    })

    expect(watcherMocks.refresh).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(result.current.isRefreshing).toBe(false))
  })

  it('stops polling when unmounted', () => {
    const { unmount } = renderHook(() => useAssetBalance('GTEST'))

    unmount()

    expect(watcherMocks.stop).toHaveBeenCalled()
  })

  it('fetches once without polling when autoRefresh is disabled', () => {
    renderHook(() => useAssetBalance('GTEST', { autoRefresh: false }))

    expect(watcherMocks.start).not.toHaveBeenCalled()
    expect(watcherMocks.refresh).toHaveBeenCalledTimes(1)
  })
})
