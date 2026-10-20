import type { Horizon } from '@stellar/stellar-sdk'
import { createScopedLogger } from '@/services/logging'
import { getErrorMessage } from '@utils/error-messages'

const log = createScopedLogger('TransactionCache')

export interface CachedTransaction extends Horizon.TransactionResponse {
  _cachedAt: number
}

export interface TransactionCacheState {
  transactions: CachedTransaction[]
  cursor: string | null
  lastFetch: number | null
  isLoading: boolean
  error: string | null
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const DEFAULT_LIMIT = 50

export class TransactionCacheService {
  private state: TransactionCacheState = {
    transactions: [],
    cursor: null,
    lastFetch: null,
    isLoading: false,
    error: null,
  }

  private listeners: Set<(state: TransactionCacheState) => void> = new Set()

  constructor() {
    this.restoreFromStorage()
  }

  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem('stellar-nebula:tx-cache')
      if (stored) {
        const parsed = JSON.parse(stored)
        const now = Date.now()
        if (parsed.lastFetch && now - parsed.lastFetch < CACHE_TTL) {
          this.state = parsed
          log.info('Transaction cache restored from storage', {
            count: this.state.transactions.length,
          })
          return
        }
        this.clearCache()
      }
    } catch (err) {
      log.warn('Failed to restore transaction cache from storage', err)
      this.clearCache()
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('stellar-nebula:tx-cache', JSON.stringify(this.state))
    } catch (err) {
      log.warn('Failed to save transaction cache to storage', err)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state))
  }

  subscribe(listener: (state: TransactionCacheState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState(): TransactionCacheState {
    return { ...this.state }
  }

  async fetchTransactions(
    horizonServer: Horizon.Server,
    accountId: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<CachedTransaction[]> {
    const now = Date.now()
    const isCacheValid = this.state.lastFetch && now - this.state.lastFetch < CACHE_TTL

    if (isCacheValid && this.state.transactions.length > 0) {
      log.info('Returning cached transactions', {
        count: this.state.transactions.length,
      })
      return this.state.transactions
    }

    this.state.isLoading = true
    this.state.error = null
    this.notifyListeners()

    try {
      const response = await horizonServer
        .transactions()
        .forAccount(accountId)
        .order('desc')
        .limit(limit)
        .call()

      const transactions: CachedTransaction[] = response.records.map((tx) => ({
        ...tx,
        _cachedAt: now,
      }))

      this.state.transactions = transactions
      this.state.cursor = response.next ? response.next.split('cursor=')[1] : null
      this.state.lastFetch = now
      this.state.isLoading = false

      this.saveToStorage()
      this.notifyListeners()

      log.info('Transactions fetched and cached', {
        count: transactions.length,
        cursor: this.state.cursor ? 'exists' : 'none',
      })

      return transactions
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to fetch transactions')
      log.error('Failed to fetch transactions', err instanceof Error ? err : new Error(message))
      this.state.isLoading = false
      this.state.error = message
      this.notifyListeners()
      throw err
    }
  }

  async fetchNextPage(
    horizonServer: Horizon.Server,
    accountId: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<CachedTransaction[]> {
    if (!this.state.cursor) {
      log.warn('No cursor available for pagination')
      return []
    }

    this.state.isLoading = true
    this.state.error = null
    this.notifyListeners()

    try {
      const response = await horizonServer
        .transactions()
        .forAccount(accountId)
        .order('desc')
        .cursor(this.state.cursor)
        .limit(limit)
        .call()

      const newTransactions: CachedTransaction[] = response.records.map((tx) => ({
        ...tx,
        _cachedAt: Date.now(),
      }))

      this.state.transactions = [...this.state.transactions, ...newTransactions]
      this.state.cursor = response.next ? response.next.split('cursor=')[1] : null
      this.state.isLoading = false

      this.saveToStorage()
      this.notifyListeners()

      log.info('Next page fetched', {
        newCount: newTransactions.length,
        totalCount: this.state.transactions.length,
      })

      return this.state.transactions
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to fetch next page')
      log.error('Failed to fetch next page', err instanceof Error ? err : new Error(message))
      this.state.isLoading = false
      this.state.error = message
      this.notifyListeners()
      throw err
    }
  }

  async fetchNewTransactions(
    horizonServer: Horizon.Server,
    accountId: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<CachedTransaction[]> {
    this.state.isLoading = true
    this.state.error = null
    this.notifyListeners()

    try {
      const response = await horizonServer
        .transactions()
        .forAccount(accountId)
        .order('desc')
        .limit(limit)
        .call()

      const newTransactions: CachedTransaction[] = response.records.map((tx) => ({
        ...tx,
        _cachedAt: Date.now(),
      }))

      const existingIds = new Set(this.state.transactions.map((tx) => tx.id))
      const actuallyNew = newTransactions.filter((tx) => !existingIds.has(tx.id))

      this.state.transactions = [...actuallyNew, ...this.state.transactions]
      this.state.cursor = response.next ? response.next.split('cursor=')[1] : null
      this.state.lastFetch = Date.now()
      this.state.isLoading = false

      this.saveToStorage()
      this.notifyListeners()

      log.info('New transactions fetched', {
        newCount: actuallyNew.length,
        totalCount: this.state.transactions.length,
      })

      return this.state.transactions
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to fetch new transactions')
      log.error('Failed to fetch new transactions', err instanceof Error ? err : new Error(message))
      this.state.isLoading = false
      this.state.error = message
      this.notifyListeners()
      throw err
    }
  }

  clearCache(): void {
    this.state = {
      transactions: [],
      cursor: null,
      lastFetch: null,
      isLoading: false,
      error: null,
    }
    try {
      localStorage.removeItem('stellar-nebula:tx-cache')
    } catch {
      // ignore
    }
    this.notifyListeners()
    log.info('Transaction cache cleared')
  }

  invalidateCache(): void {
    this.state.lastFetch = null
    this.notifyListeners()
    log.info('Transaction cache invalidated')
  }

  isCacheValid(): boolean {
    if (!this.state.lastFetch) return false
    const now = Date.now()
    return now - this.state.lastFetch < CACHE_TTL
  }

  getCacheAge(): number {
    if (!this.state.lastFetch) return Infinity
    return Date.now() - this.state.lastFetch
  }
}

let cacheInstance: TransactionCacheService | null = null

export function getTransactionCacheService(): TransactionCacheService {
  if (!cacheInstance) {
    cacheInstance = new TransactionCacheService()
  }
  return cacheInstance
}

export function resetTransactionCache(): void {
  cacheInstance = null
}
