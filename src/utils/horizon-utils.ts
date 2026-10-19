import type { Horizon } from '@stellar/stellar-sdk'
import { createScopedLogger } from '@/services/logging'
import { withRateLimit } from '@/utils/rate-limiter'

const log = createScopedLogger('HorizonUtils')

export interface TransactionFetchOptions {
  limit?: number
  cursor?: string
  order?: 'asc' | 'desc'
}

export async function fetchAccountTransactions(
  horizonServer: Horizon.Server,
  accountId: string,
  options: TransactionFetchOptions = {}
): Promise<Horizon.CollectionPage<Horizon.TransactionResponse>> {
  const { limit = 50, cursor, order = 'desc' } = options

  try {
    let query = horizonServer.transactions().forAccount(accountId).limit(limit).order(order)

    if (cursor) {
      query = query.cursor(cursor)
    }

    // Issue #483: Horizon calls are throttled client-side (see docs/API_LIMITS.md)
    const result = await withRateLimit('horizon', () => query.call())
    log.info('Transactions fetched', {
      accountId: accountId.slice(0, 8),
      count: result.records.length,
      hasNext: !!result.next,
    })

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch account transactions'
    log.error('Failed to fetch account transactions', err instanceof Error ? err : new Error(message))
    throw err
  }
}

export async function fetchIncrementalTransactions(
  horizonServer: Horizon.Server,
  accountId: string,
  lastSeenId: string | null,
  limit: number = 50
): Promise<Horizon.TransactionResponse[]> {
  try {
    const options: TransactionFetchOptions = {
      limit,
      order: 'asc',
    }

    if (lastSeenId) {
      options.cursor = lastSeenId
    }

    const result = await fetchAccountTransactions(horizonServer, accountId, options)

    log.info('Incremental transactions fetched', {
      count: result.records.length,
      lastSeenId: lastSeenId ? 'provided' : 'none',
    })

    return result.records
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch incremental transactions'
    log.error('Failed to fetch incremental transactions', err instanceof Error ? err : new Error(message))
    throw err
  }
}

export async function getLatestTransaction(
  horizonServer: Horizon.Server,
  accountId: string
): Promise<Horizon.TransactionResponse | null> {
  try {
    const result = await horizonServer
      .transactions()
      .forAccount(accountId)
      .order('desc')
      .limit(1)
      .call()

    if (result.records.length === 0) {
      log.info('No transactions found for account', { accountId: accountId.slice(0, 8) })
      return null
    }

    return result.records[0]
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get latest transaction'
    log.error('Failed to get latest transaction', err instanceof Error ? err : new Error(message))
    throw err
  }
}

export async function getTransactionById(
  horizonServer: Horizon.Server,
  transactionId: string
): Promise<Horizon.TransactionResponse> {
  try {
    const tx = await horizonServer.transactions().transaction(transactionId).call()
    log.info('Transaction fetched by ID', { transactionId: transactionId.slice(0, 8) })
    return tx
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch transaction'
    log.error('Failed to fetch transaction by ID', err instanceof Error ? err : new Error(message))
    throw err
  }
}

export function extractNextCursor(response: Horizon.CollectionPage<any>): string | null {
  if (!response.next) return null

  try {
    const url = new URL(response.next)
    return url.searchParams.get('cursor')
  } catch {
    return null
  }
}

export function parseTransactionResponse(tx: Horizon.TransactionResponse) {
  return {
    id: tx.id,
    hash: tx.hash,
    ledger: tx.ledger,
    createdAt: new Date(tx.created_at),
    operationCount: tx.operation_count,
    sourceAccount: tx.source_account,
    fee: parseInt(tx.fee),
    successful: tx.successful,
  }
}
