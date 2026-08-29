import { useState, useEffect, useCallback, useRef } from 'react'
import {
  initTransactionHistory,
  syncTransactions,
  loadMoreTransactions,
  filterTransactions,
  searchTransactions,
  getTransactionStats,
  clearTransactionHistory,
} from '@/services/history/transactionPersistence'
import type {
  PersistedTransaction,
  TransactionFilter,
  TransactionHistoryState,
  SyncResult,
} from '@/services/history/transactionPersistence'
import type { StellarNetworkConfig } from '@/config/stellar'
import { createScopedLogger } from '@/services/logging'

const log = createScopedLogger('useTransactionHistory')

export interface UseTransactionHistoryOptions {
  /** Whether to auto-sync on mount */
  autoSync?: boolean
  /** Sync interval in ms (0 to disable) */
  syncIntervalMs?: number
  /** Network config override */
  config?: StellarNetworkConfig
}

export interface UseTransactionHistoryReturn {
  /** All stored transactions (newest first) */
  transactions: PersistedTransaction[]
  /** Filtered transactions based on current filter */
  filteredTransactions: PersistedTransaction[]
  /** Whether a sync is in progress */
  isLoading: boolean
  /** Whether initial load is complete */
  isInitialized: boolean
  /** Error message if sync failed */
  error: string | null
  /** Last sync timestamp */
  lastSyncedAt: number | null
  /** Whether more pages are available */
  hasMore: boolean
  /** Transaction statistics */
  stats: {
    total: number
    successful: number
    failed: number
    totalFees: string
    averageFee: string
  }
  /** Current filter */
  currentFilter: TransactionFilter
  /** Sync with Horizon */
  sync: (force?: boolean) => Promise<SyncResult | null>
  /** Load next page */
  loadMore: () => Promise<void>
  /** Apply a filter */
  setFilter: (filter: TransactionFilter) => void
  /** Search transactions */
  search: (query: string) => void
  /** Clear all stored data */
  clearHistory: () => void
  /** Get a transaction by hash */
  getByHash: (hash: string) => PersistedTransaction | undefined
}

/**
 * React hook for managing transaction history with local persistence.
 *
 * Provides automatic syncing, filtering, search, and pagination
 * with data persisted to localStorage.
 *
 * @param accountId - The Stellar public key
 * @param network   - The Stellar network name
 * @param options   - Hook configuration options
 *
 * @example
 * const {
 *   transactions,
 *   filteredTransactions,
 *   isLoading,
 *   sync,
 *   search,
 * } = useTransactionHistory(publicKey, 'testnet')
 */
export function useTransactionHistory(
  accountId: string | null,
  network: string,
  options: UseTransactionHistoryOptions = {}
): UseTransactionHistoryReturn {
  const { autoSync = true, syncIntervalMs = 0, config } = options

  const [state, setState] = useState<TransactionHistoryState>({
    transactions: [],
    isSyncing: false,
    lastSyncedAt: null,
    hasMore: true,
    nextCursor: null,
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilterState] = useState<TransactionFilter>({})
  const syncRef = useRef<(() => Promise<SyncResult | null>) | null>(null)

  // Initialize on mount
  useEffect(() => {
    if (!accountId) {
      setState((prev) => ({ ...prev, transactions: [] }))
      setIsInitialized(true)
      return
    }

    const initialState = initTransactionHistory(accountId, network)
    setState(initialState)
    setIsInitialized(true)

    log.info('Transaction history hook initialized', {
      accountId: accountId.slice(0, 8),
      network,
      cachedCount: initialState.transactions.length,
    })
  }, [accountId, network])

  // Auto-sync on mount
  useEffect(() => {
    if (!accountId || !autoSync || !isInitialized) return

    const doSync = async () => {
      try {
        setState((prev) => ({ ...prev, isSyncing: true }))
        setError(null)
        const result = await syncTransactions(accountId, network, config, true)
        const updatedState = initTransactionHistory(accountId, network)
        setState(updatedState)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed'
        setError(message)
        log.error('Auto-sync failed', err instanceof Error ? err : new Error(message))
        return null
      } finally {
        setState((prev) => ({ ...prev, isSyncing: false }))
      }
    }

    syncRef.current = doSync
    doSync()
  }, [accountId, network, autoSync, isInitialized, config])

  // Periodic sync
  useEffect(() => {
    if (!accountId || syncIntervalMs <= 0) return

    const interval = setInterval(() => {
      if (syncRef.current) {
        void syncRef.current()
      }
    }, syncIntervalMs)

    return () => clearInterval(interval)
  }, [accountId, syncIntervalMs])

  // Sync function
  const sync = useCallback(
    async (force = false): Promise<SyncResult | null> => {
      if (!accountId) return null

      try {
        setState((prev) => ({ ...prev, isSyncing: true }))
        setError(null)
        const result = await syncTransactions(accountId, network, config, force)
        const updatedState = initTransactionHistory(accountId, network)
        setState(updatedState)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed'
        setError(message)
        return null
      } finally {
        setState((prev) => ({ ...prev, isSyncing: false }))
      }
    },
    [accountId, network, config]
  )

  // Load more
  const loadMore = useCallback(async () => {
    if (!accountId || !state.nextCursor || !state.hasMore) return

    try {
      setState((prev) => ({ ...prev, isSyncing: true }))
      await loadMoreTransactions(accountId, network, state.nextCursor, config)
      const updatedState = initTransactionHistory(accountId, network)
      setState(updatedState)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Load more failed'
      setError(message)
    } finally {
      setState((prev) => ({ ...prev, isSyncing: false }))
    }
  }, [accountId, network, state.nextCursor, state.hasMore, config])

  // Set filter
  const setFilter = useCallback((newFilter: TransactionFilter) => {
    setFilterState(newFilter)
  }, [])

  // Search
  const search = useCallback((query: string) => {
    setFilterState((prev) => ({ ...prev, searchQuery: query }))
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    if (!accountId) return
    clearTransactionHistory(accountId, network)
    setState({
      transactions: [],
      isSyncing: false,
      lastSyncedAt: null,
      hasMore: true,
      nextCursor: null,
    })
    setError(null)
    setFilterState({})
  }, [accountId, network])

  // Get by hash
  const getByHash = useCallback(
    (hash: string) => {
      return state.transactions.find((tx) => tx.hash === hash)
    },
    [state.transactions]
  )

  // Compute filtered transactions
  const filteredTransactions = filterTransactions(state.transactions, filter)

  // Compute stats
  const stats = getTransactionStats(state.transactions)

  return {
    transactions: state.transactions,
    filteredTransactions,
    isLoading: state.isSyncing,
    isInitialized,
    error,
    lastSyncedAt: state.lastSyncedAt,
    hasMore: state.hasMore,
    stats,
    currentFilter: filter,
    sync,
    loadMore,
    setFilter,
    search,
    clearHistory,
    getByHash,
  }
}
