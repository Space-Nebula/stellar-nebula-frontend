import { useCallback, useEffect, useRef, useState } from 'react'
import { createBalanceWatcher } from '@services/balance-watcher'
import { getErrorMessage } from '@utils/error-messages'
import { loadCachedBalances, saveCachedBalances, type FormattedBalance } from '@utils/horizon-utils'
import type { StellarNetworkConfig } from '@config/stellar'

/** How long the "balance changed" highlight stays on screen. */
const BALANCE_CHANGED_HIGHLIGHT_MS = 2_000

export interface UseAssetBalanceOptions {
  /** Network override; defaults to the active Stellar config. */
  config?: StellarNetworkConfig
  /** Poll cadence in ms. Defaults to 5 seconds (see balance-watcher). */
  pollIntervalMs?: number
  /** Set false to only fetch on mount/manual refresh. Defaults to true. */
  autoRefresh?: boolean
}

export interface UseAssetBalanceResult {
  balances: FormattedBalance[]
  /** True during the initial load, before the first snapshot arrives. */
  isLoading: boolean
  /** True while a manual refresh is in flight. */
  isRefreshing: boolean
  error: string | null
  isUnfunded: boolean
  /** Whether the 5-second poll is active. */
  isPolling: boolean
  /** True briefly after a poll detects a changed balance. */
  balanceChanged: boolean
  lastUpdated: number | null
  /** Fetch balances immediately (manual refresh control). */
  refresh: () => Promise<void>
}

function haveBalancesChanged(previous: FormattedBalance[], next: FormattedBalance[]): boolean {
  if (previous.length !== next.length) return true
  return next.some((balance, index) => {
    const old = previous[index]
    return (
      !old ||
      old.assetCode !== balance.assetCode ||
      old.assetIssuer !== balance.assetIssuer ||
      old.balance !== balance.balance
    )
  })
}

/**
 * Track a Stellar account's balances and keep them fresh.
 *
 * Balances are polled every 5 seconds (configurable), refreshed immediately
 * after a manual `refresh()`, and restored from a local cache on mount so the
 * UI never flashes empty while Horizon answers.
 *
 * @example
 * const { balances, isLoading, refresh } = useAssetBalance(publicKey)
 */
export function useAssetBalance(
  accountId: string | null | undefined,
  options: UseAssetBalanceOptions = {}
): UseAssetBalanceResult {
  const { config, pollIntervalMs, autoRefresh = true } = options

  const [balances, setBalances] = useState<FormattedBalance[]>(() =>
    accountId ? (loadCachedBalances(accountId) ?? []) : []
  )
  const [trackedAccountId, setTrackedAccountId] = useState(accountId)
  const [error, setError] = useState<string | null>(null)
  const [isUnfunded, setIsUnfunded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [balanceChanged, setBalanceChanged] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const watcherRef = useRef<ReturnType<typeof createBalanceWatcher> | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const horizonUrl = config?.horizonUrl

  // Switching accounts is a state reset, not a side effect: adjust it during
  // render so the previous account's balances can never paint for the new one.
  if (accountId !== trackedAccountId) {
    setTrackedAccountId(accountId)
    setBalances(accountId ? (loadCachedBalances(accountId) ?? []) : [])
    setError(null)
    setIsUnfunded(false)
    setLastUpdated(null)
    setBalanceChanged(false)
  }

  useEffect(() => {
    if (!accountId) {
      watcherRef.current = null
      return
    }

    const watcher = createBalanceWatcher({
      accountId,
      config,
      intervalMs: pollIntervalMs,
      onChange: (snapshot, previous) => {
        setBalances((current) => {
          const changed = haveBalancesChanged(current, snapshot.balances)
          if (changed) {
            setBalanceChanged(true)
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
            highlightTimerRef.current = setTimeout(() => {
              setBalanceChanged(false)
            }, BALANCE_CHANGED_HIGHLIGHT_MS)
          }
          return snapshot.balances
        })
        setIsUnfunded(snapshot.unfunded)
        setLastUpdated(snapshot.fetchedAt)
        setError(null)

        if (snapshot.unfunded) {
          saveCachedBalances(accountId, [])
        } else if (previous === null || haveBalancesChanged(previous.balances, snapshot.balances)) {
          saveCachedBalances(accountId, snapshot.balances)
        }
      },
      onError: (err) => {
        setError(getErrorMessage(err, 'Failed to fetch balances'))
      },
    })

    watcherRef.current = watcher
    if (autoRefresh) {
      watcher.start()
    } else {
      void watcher.refresh()
    }

    return () => {
      watcher.stop()
      watcherRef.current = null
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = null
      }
    }
    // `config` object identity is unstable; horizonUrl captures the meaningful change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, pollIntervalMs, autoRefresh, horizonUrl])

  const refresh = useCallback(async () => {
    const watcher = watcherRef.current
    if (!watcher) return

    setIsRefreshing(true)
    setError(null)
    try {
      await watcher.refresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  return {
    balances,
    isLoading: Boolean(accountId) && lastUpdated === null && !isUnfunded && error === null,
    isRefreshing,
    error,
    isUnfunded,
    isPolling: Boolean(accountId) && autoRefresh,
    balanceChanged,
    lastUpdated,
    refresh,
  }
}
