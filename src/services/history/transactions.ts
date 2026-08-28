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

export interface HistoryOperation {
  type: string
  summary: string
  assetCode?: string
  amount?: string
}

export interface HistoryTransaction {
  hash: string
  created_at: string
  successful: boolean
  memo?: string
  operations: HistoryOperation[]
}

export interface HistoryTransactionPage {
  records: HistoryTransaction[]
  nextHref: string | null
}

interface HorizonTransactionRecord {
  hash: string
  ledger?: number | string
  created_at: string
  source_account: string
  fee_charged?: string | number
  successful?: boolean
  memo?: string | null
  paging_token?: string
  operation_count?: number | string
}

function readNextHref(response: unknown): string | null {
  return (response as { _links?: { next?: { href?: string } } })._links?.next?.href ?? null
}

function readLastCursor(records: Horizon.ServerApi.TransactionRecord[]): string | null {
  const lastRecord = records.at(-1) as { paging_token?: string } | undefined
  return lastRecord?.paging_token ?? null
}

function mapHorizonTransaction(tx: Horizon.ServerApi.TransactionRecord): StellarTransaction {
  const record = tx as unknown as HorizonTransactionRecord
  const ledger = Number(record.ledger)

  return {
    hash: record.hash,
    ledger: Number.isFinite(ledger) ? ledger : undefined,
    createdAt: record.created_at,
    sourceAccount: record.source_account,
    feeCharged: String(record.fee_charged ?? '0'),
    status: record.successful === false ? 'failed' : 'success',
    memo: record.memo ?? undefined,
  }
}

function mapHistoryTransaction(tx: Horizon.ServerApi.TransactionRecord): HistoryTransaction {
  const record = tx as unknown as HorizonTransactionRecord
  const operationCount = Number(record.operation_count ?? 0)

  return {
    hash: record.hash,
    created_at: record.created_at,
    successful: record.successful !== false,
    memo: record.memo ?? undefined,
    operations: [
      {
        type: 'transaction',
        summary: `${operationCount || 1} operation${operationCount === 1 ? '' : 's'} included`,
      },
    ],
  }
}

export function summarizeHistoryOperation(operation: HistoryOperation): string {
  if (operation.amount && operation.assetCode) {
    return `${operation.summary}: ${operation.amount} ${operation.assetCode}`
  }

  return operation.summary
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
  const nextHref = readNextHref(response)
  const hasMore = Boolean(nextHref) || response.records.length >= limit

  return {
    transactions,
    nextCursor: hasMore ? readLastCursor(response.records) : null,
    hasMore,
  }
}

export async function loadTransactionHistoryPage(
  accountId: string,
  config?: StellarNetworkConfig,
  cursor?: string,
  limit = 8
): Promise<HistoryTransactionPage> {
  const horizon = createHorizonServer(config ?? getActiveStellarConfig())
  const builder = horizon.transactions().forAccount(accountId).limit(limit).order('desc')

  if (cursor) {
    builder.cursor(cursor)
  }

  const response = await builder.call()
  const nextHref = readNextHref(response)
  const hasMore = Boolean(nextHref) || response.records.length >= limit

  return {
    records: response.records.map(mapHistoryTransaction),
    nextHref: nextHref ?? (hasMore ? readLastCursor(response.records) : null),
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
