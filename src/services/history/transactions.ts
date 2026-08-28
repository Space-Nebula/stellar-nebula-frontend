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
  const record = tx as unknown as {
    hash: string
    ledger?: number
    created_at: string
    source_account: string
    fee_charged: string
    successful: boolean
    memo?: string | null
  }

  return {
    hash: record.hash,
    ledger: record.ledger,
    createdAt: record.created_at,
    sourceAccount: record.source_account,
    feeCharged: record.fee_charged,
    status: record.successful ? 'success' : 'failed',
    memo: record.memo ?? undefined,
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

  const nextLink = (response as unknown as { _links?: { next?: { href?: string } } })._links?.next
    ?.href

  return {
    transactions,
    nextCursor: nextLink ?? null,
    hasMore: Boolean(response.next),
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
