import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Horizon } from '@stellar/stellar-sdk'
import { createBalanceWatcher, DEFAULT_BALANCE_POLL_INTERVAL_MS } from '../balance-watcher'

interface FakeAccountResponse {
  balances: Array<Record<string, string>>
}

function balanceLine(overrides: Record<string, string>): Record<string, string> {
  return overrides
}

function accountResponse(): FakeAccountResponse {
  return {
    balances: [
      balanceLine({
        asset_type: 'credit_alphanum4',
        asset_code: 'NEB',
        asset_issuer: 'GISSUER',
        balance: '25.0000000',
      }),
      balanceLine({ asset_type: 'native', balance: '100.0000000' }),
    ],
  }
}

function fakeServer(call: () => Promise<FakeAccountResponse>) {
  return {
    accounts: () => ({
      accountId: () => ({ call }),
    }),
  } as unknown as Horizon.Server
}

describe('createBalanceWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls immediately, then every 5 seconds by default', async () => {
    const call = vi.fn().mockResolvedValue(accountResponse())
    const onChange = vi.fn()
    const watcher = createBalanceWatcher({
      accountId: 'GTEST',
      horizonServer: fakeServer(call),
      onChange,
    })

    watcher.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(call).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(DEFAULT_BALANCE_POLL_INTERVAL_MS).toBe(5_000)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(call).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(call).toHaveBeenCalledTimes(3)

    watcher.stop()
  })

  it('puts native XLM first and exposes the latest snapshot', async () => {
    const watcher = createBalanceWatcher({
      accountId: 'GTEST',
      horizonServer: fakeServer(vi.fn().mockResolvedValue(accountResponse())),
    })

    await watcher.refresh()

    expect(watcher.getSnapshot()?.balances[0]).toMatchObject({ assetCode: 'XLM', isNative: true })
    expect(watcher.getSnapshot()?.balances[1]).toMatchObject({ assetCode: 'NEB', isNative: false })
    expect(watcher.getSnapshot()?.unfunded).toBe(false)
  })

  it('does not schedule overlapping polls while one is in flight', async () => {
    let resolveCall: (value: FakeAccountResponse) => void = () => {}
    const call = vi.fn().mockImplementation(
      () =>
        new Promise<FakeAccountResponse>((resolve) => {
          resolveCall = resolve
        })
    )
    const watcher = createBalanceWatcher({
      accountId: 'GTEST',
      horizonServer: fakeServer(call),
    })

    watcher.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(call).toHaveBeenCalledTimes(1)

    // A manual refresh while the first request is pending must not add a request.
    const pendingRefresh = watcher.refresh()
    await expect(pendingRefresh).resolves.toBeNull()
    expect(call).toHaveBeenCalledTimes(1)

    resolveCall(accountResponse())
    await vi.advanceTimersByTimeAsync(0)
    expect(call).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(call).toHaveBeenCalledTimes(2)

    watcher.stop()
  })

  it('treats a 404 from Horizon as an unfunded account, not an error', async () => {
    const notFound = Object.assign(new Error('Account not found'), { response: { status: 404 } })
    const onChange = vi.fn()
    const onError = vi.fn()
    const watcher = createBalanceWatcher({
      accountId: 'GUNFUNDED',
      horizonServer: fakeServer(vi.fn().mockRejectedValue(notFound)),
      onChange,
      onError,
    })

    await watcher.refresh()

    expect(onError).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ balances: [], unfunded: true }),
      null
    )
    expect(watcher.getSnapshot()?.unfunded).toBe(true)
  })

  it('reports other failures and keeps polling', async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(new Error('Horizon unavailable'))
      .mockResolvedValue(accountResponse())
    const onError = vi.fn()
    const onChange = vi.fn()
    const watcher = createBalanceWatcher({
      accountId: 'GTEST',
      horizonServer: fakeServer(call),
      onChange,
      onError,
    })

    watcher.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Horizon unavailable' })
    )
    expect(onChange).not.toHaveBeenCalled()
    expect(watcher.isRunning()).toBe(true)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(call).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenCalledTimes(1)

    watcher.stop()
  })

  it('stops polling after stop()', async () => {
    const call = vi.fn().mockResolvedValue(accountResponse())
    const watcher = createBalanceWatcher({
      accountId: 'GTEST',
      horizonServer: fakeServer(call),
    })

    watcher.start()
    await vi.advanceTimersByTimeAsync(0)
    watcher.stop()

    await vi.advanceTimersByTimeAsync(20_000)

    expect(call).toHaveBeenCalledTimes(1)
    expect(watcher.isRunning()).toBe(false)
  })

  it('uses a custom poll interval when provided', async () => {
    const call = vi.fn().mockResolvedValue(accountResponse())
    const watcher = createBalanceWatcher({
      accountId: 'GTEST',
      intervalMs: 1_000,
      horizonServer: fakeServer(call),
    })

    watcher.start()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(call).toHaveBeenCalledTimes(2)
    watcher.stop()
  })
})
