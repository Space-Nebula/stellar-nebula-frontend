import type { StellarTransaction } from '@/types'
import { getTransactionHistory } from './transactions'
import type { StellarNetworkConfig } from '@/config/stellar'
import { createScopedLogger } from '@/services/logging'

const log = createScopedLogger('TransactionPersistence')

// ─── Storage keys ─────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'stellar-nebula:tx-history'
const MAX_STORED_TRANSACTIONS = 500
const SYNC_COOLDOWN_MS = 60_000 // Don't re-sync within 60 seconds

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersistedTransaction extends StellarTransaction {
  /** When this transaction was first persisted locally */
  persistedAt: number
  /** Which network this transaction belongs to */
  network: string
  /** Operation type summary (if available from Horizon) */
  operationType?: string
  /** Memo decoded for display */
  memoDisplay?: string
}

export interface TransactionFilter {
  /** Filter by transaction status */
  status?: StellarTransaction['status']
  /** Filter by date range */
  fromDate?: string
  toDate?: string
  /** Search in memo, hash, or source account */
  searchQuery?: string
  /** Filter by network */
  network?: string
}

export interface TransactionHistoryState {
  /** All stored transactions (newest first) */
  transactions: PersistedTransaction[]
  /** Whether a sync is currently in progress */
  isSyncing: boolean
  /** Timestamp of last successful sync */
  lastSyncedAt: number | null
  /** Whether there are more transactions available on Horizon */
  hasMore: boolean
  /** Cursor for the next page from Horizon */
  nextCursor: string | null
}

export interface SyncResult {
  /** Number of new transactions fetched */
  newCount: number
  /** Total count after sync */
  totalCount: number
  /** Whether there are more pages */
  hasMore: boolean
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getStorageKey(accountId: string, network: string): string {
  return `${STORAGE_PREFIX}:${network}:${accountId}`
}

function getStateStorageKey(accountId: string, network: string): string {
  return `${STORAGE_PREFIX}:state:${network}:${accountId}`
}

function loadTransactions(accountId: string, network: string): PersistedTransaction[] {
  try {
    const key = getStorageKey(accountId, network)
    const raw = localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw) as PersistedTransaction[]
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    log.error(
      'Failed to load transactions from storage',
      error instanceof Error ? error : new Error(String(error))
    )
    return []
  }
}

function saveTransactions(
  accountId: string,
  network: string,
  transactions: PersistedTransaction[]
): void {
  try {
    // Enforce max size by keeping newest transactions
    const trimmed = transactions.slice(0, MAX_STORED_TRANSACTIONS)
    const key = getStorageKey(accountId, network)
    localStorage.setItem(key, JSON.stringify(trimmed))
  } catch (error) {
    log.error(
      'Failed to save transactions to storage',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

function loadState(accountId: string, network: string): Partial<TransactionHistoryState> {
  try {
    const key = getStateStorageKey(accountId, network)
    const raw = localStorage.getItem(key)
    if (!raw) return {}

    return JSON.parse(raw) as Partial<TransactionHistoryState>
  } catch {
    return {}
  }
}

function saveState(
  accountId: string,
  network: string,
  state: Pick<TransactionHistoryState, 'lastSyncedAt' | 'hasMore' | 'nextCursor'>
): void {
  try {
    const key = getStateStorageKey(accountId, network)
    localStorage.setItem(key, JSON.stringify(state))
  } catch (error) {
    log.error(
      'Failed to save sync state',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

// ─── Transaction mapping ──────────────────────────────────────────────────────

function toPersisted(tx: StellarTransaction, network: string): PersistedTransaction {
  return {
    ...tx,
    persistedAt: Date.now(),
    network,
    memoDisplay: tx.memo ? decodeMemo(tx.memo) : undefined,
  }
}

function decodeMemo(memo: string): string {
  try {
    // Try to decode base64 memo
    const decoded = atob(memo)
    // Check if it's printable
    if (/^[\x20-\x7E]+$/.test(decoded)) {
      return decoded
    }
  } catch {
    // Not base64, use as-is
  }
  return memo
}

function deduplicate(transactions: PersistedTransaction[]): PersistedTransaction[] {
  const seen = new Set<string>()
  return transactions.filter((tx) => {
    if (seen.has(tx.hash)) return false
    seen.add(tx.hash)
    return true
  })
}

function sortByDate(transactions: PersistedTransaction[]): PersistedTransaction[] {
  return [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the transaction history for an account.
 *
 * Loads persisted transactions from localStorage and optionally
 * triggers a sync with Horizon.
 *
 * @param accountId - The Stellar public key
 * @param network   - The Stellar network name
 * @returns Current transaction history state
 */
export function initTransactionHistory(
  accountId: string,
  network: string
): TransactionHistoryState {
  const transactions = loadTransactions(accountId, network)
  const state = loadState(accountId, network)

  log.info('Transaction history initialized', {
    accountId: accountId.slice(0, 8),
    network,
    transactionCount: transactions.length,
  })

  return {
    transactions: sortByDate(transactions),
    isSyncing: false,
    lastSyncedAt: state.lastSyncedAt ?? null,
    hasMore: state.hasMore ?? true,
    nextCursor: state.nextCursor ?? null,
  }
}

/**
 * Sync transactions from Horizon and persist locally.
 *
 * Fetches the latest transactions from Horizon, merges with local data,
 * deduplicates, and persists the result.
 *
 * @param accountId - The Stellar public key
 * @param network   - The Stellar network name
 * @param config    - Optional network config override
 * @param force     - Force sync even if cooldown hasn't elapsed
 * @returns Sync result with counts
 */
export async function syncTransactions(
  accountId: string,
  network: string,
  config?: StellarNetworkConfig,
  force = false
): Promise<SyncResult> {
  const state = loadState(accountId, network)

  // Respect cooldown unless forced
  if (!force && state.lastSyncedAt && Date.now() - state.lastSyncedAt < SYNC_COOLDOWN_MS) {
    log.debug('Sync cooldown active, skipping', {
      lastSyncedAt: state.lastSyncedAt,
    })
    const existing = loadTransactions(accountId, network)
    return {
      newCount: 0,
      totalCount: existing.length,
      hasMore: state.hasMore ?? true,
    }
  }

  log.info('Starting transaction sync', {
    accountId: accountId.slice(0, 8),
    network,
  })

  try {
    const existing = loadTransactions(accountId, network)
    const existingHashes = new Set(existing.map((tx) => tx.hash))

    // Fetch from Horizon
    const {
      transactions: horizonTxs,
      hasMore,
      nextCursor,
    } = await getTransactionHistory(accountId, { limit: 50, order: 'desc' }, config)

    // Convert and filter new transactions
    const newTxs = horizonTxs
      .filter((tx) => !existingHashes.has(tx.hash))
      .map((tx) => toPersisted(tx, network))

    // Merge and deduplicate
    const merged = deduplicate([...newTxs, ...existing])
    const sorted = sortByDate(merged)

    // Persist
    saveTransactions(accountId, network, sorted)
    saveState(accountId, network, {
      lastSyncedAt: Date.now(),
      hasMore,
      nextCursor,
    })

    log.info('Transaction sync completed', {
      newCount: newTxs.length,
      totalCount: sorted.length,
      hasMore,
    })

    return {
      newCount: newTxs.length,
      totalCount: sorted.length,
      hasMore,
    }
  } catch (error) {
    log.error('Transaction sync failed', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

/**
 * Load the next page of older transactions from Horizon.
 *
 * @param accountId - The Stellar public key
 * @param network   - The Stellar network name
 * @param cursor    - The cursor to paginate from
 * @param config    - Optional network config override
 * @returns Sync result with the new page of transactions
 */
export async function loadMoreTransactions(
  accountId: string,
  network: string,
  cursor: string,
  config?: StellarNetworkConfig
): Promise<SyncResult> {
  try {
    const {
      transactions: horizonTxs,
      hasMore,
      nextCursor,
    } = await getTransactionHistory(accountId, { limit: 50, cursor, order: 'desc' }, config)

    const existing = loadTransactions(accountId, network)
    const existingHashes = new Set(existing.map((tx) => tx.hash))

    const newTxs = horizonTxs
      .filter((tx) => !existingHashes.has(tx.hash))
      .map((tx) => toPersisted(tx, network))

    const merged = deduplicate([...existing, ...newTxs])
    const sorted = sortByDate(merged)

    saveTransactions(accountId, network, sorted)
    saveState(accountId, network, {
      lastSyncedAt: Date.now(),
      hasMore,
      nextCursor,
    })

    return {
      newCount: newTxs.length,
      totalCount: sorted.length,
      hasMore,
    }
  } catch (error) {
    log.error(
      'Failed to load more transactions',
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

/**
 * Filter stored transactions by various criteria.
 *
 * @param transactions - Array of persisted transactions
 * @param filter       - Filter criteria
 * @returns Filtered and sorted transactions
 */
export function filterTransactions(
  transactions: PersistedTransaction[],
  filter: TransactionFilter
): PersistedTransaction[] {
  let result = [...transactions]

  // Filter by status
  if (filter.status) {
    result = result.filter((tx) => tx.status === filter.status)
  }

  // Filter by date range
  if (filter.fromDate) {
    const from = new Date(filter.fromDate).getTime()
    result = result.filter((tx) => new Date(tx.createdAt).getTime() >= from)
  }
  if (filter.toDate) {
    const to = new Date(filter.toDate).getTime()
    result = result.filter((tx) => new Date(tx.createdAt).getTime() <= to)
  }

  // Filter by network
  if (filter.network) {
    result = result.filter((tx) => tx.network === filter.network)
  }

  // Search in memo, hash, or source account
  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase()
    result = result.filter(
      (tx) =>
        tx.hash.toLowerCase().includes(query) ||
        tx.sourceAccount.toLowerCase().includes(query) ||
        (tx.memo && tx.memo.toLowerCase().includes(query)) ||
        (tx.memoDisplay && tx.memoDisplay.toLowerCase().includes(query))
    )
  }

  return sortByDate(result)
}

/**
 * Search transactions by query string.
 *
 * Searches across hash, source account, memo, and memo display.
 *
 * @param transactions - Array of persisted transactions
 * @param query        - Search query string
 * @returns Matching transactions
 */
export function searchTransactions(
  transactions: PersistedTransaction[],
  query: string
): PersistedTransaction[] {
  if (!query.trim()) return transactions

  return filterTransactions(transactions, { searchQuery: query })
}

/**
 * Get a single transaction by hash from the local store.
 */
export function getTransactionByHashLocal(
  transactions: PersistedTransaction[],
  hash: string
): PersistedTransaction | undefined {
  return transactions.find((tx) => tx.hash === hash)
}

/**
 * Get transaction statistics for display.
 */
export function getTransactionStats(transactions: PersistedTransaction[]): {
  total: number
  successful: number
  failed: number
  totalFees: string
  averageFee: string
} {
  const total = transactions.length
  const successful = transactions.filter((tx) => tx.status === 'success').length
  const failed = transactions.filter((tx) => tx.status === 'failed').length
  const totalFeesStroops = transactions.reduce((sum, tx) => sum + Number(tx.feeCharged || 0), 0)
  const averageFeesStroops = total > 0 ? totalFeesStroops / total : 0

  return {
    total,
    successful,
    failed,
    totalFees: (totalFeesStroops / 10_000_000).toFixed(7),
    averageFee: (averageFeesStroops / 10_000_000).toFixed(7),
  }
}

/**
 * Clear all stored transaction history for an account.
 */
export function clearTransactionHistory(accountId: string, network: string): void {
  try {
    localStorage.removeItem(getStorageKey(accountId, network))
    localStorage.removeItem(getStateStorageKey(accountId, network))
    log.info('Transaction history cleared', {
      accountId: accountId.slice(0, 8),
      network,
    })
  } catch (error) {
    log.error(
      'Failed to clear transaction history',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}
