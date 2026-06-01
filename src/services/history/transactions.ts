import type { Horizon } from '@stellar/stellar-sdk'
import { createHorizonServer, getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'
import type { StellarTransaction } from '@/types'

export interface TransactionHistoryOptions {
  limit?: number
  cursor?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedTransactions {
  transactions: StellarTransaction[]
  nextCursor: string | null
  hasMore: boolean
}

function mapHorizonTransaction(tx: Horizon.ServerApi.TransactionRecord): StellarTransaction {
  return {
    hash: tx.hash,
    ledger: tx.ledger,
    createdAt: tx.created_at,
    sourceAccount: tx.source_account,
    feeCharged: tx.fee_charged,
    status: tx.successful ? 'success' : 'failed',
    memo: tx.memo ?? undefined,
  }
}

/**
 * Fetch paginated Stellar transaction history for an account from Horizon.
 *
 * @param accountId - The Stellar public key
 * @param options   - Pagination and ordering options
 * @param config    - Optional network config override
 *
 * @example
 * const { transactions, hasMore } = await getTransactionHistory('G...', { limit: 10 })
 */
export async function getTransactionHistory(
  accountId: string,
  options: TransactionHistoryOptions = {},
  config?: StellarNetworkConfig
): Promise<PaginatedTransactions> {
  const horizon = createHorizonServer(config ?? getActiveStellarConfig())
  const { limit = 20, cursor, order = 'desc' } = options

  const builder = horizon.transactions().forAccount(accountId).limit(limit).order(order)

  if (cursor) {
    builder.cursor(cursor)
  }

  const response = await builder.call()
  const transactions = response.records.map(mapHorizonTransaction)

  return {
    transactions,
    nextCursor: response.next ? response.next : null,
    hasMore: !!response.next,
  }
}

/**
 * Fetch a single Stellar transaction by hash.
 */
export async function getTransactionByHash(
  hash: string,
  config?: StellarNetworkConfig
): Promise<StellarTransaction | null> {
  const horizon = createHorizonServer(config ?? getActiveStellarConfig())

  try {
    const response = await horizon.transactions().transaction(hash).call()
    return mapHorizonTransaction(response)
  } catch {
    return null
  }
}
