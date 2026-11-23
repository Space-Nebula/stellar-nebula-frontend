import type { Horizon } from '@stellar/stellar-sdk'
import { createScopedLogger } from '@/services/logging'
import { getErrorMessage } from '@utils/error-messages'

const log = createScopedLogger('HorizonUtils')

/** A transaction as returned by `server.transactions()....call()` (SDK 17 type names). */
export type TransactionRecord = Horizon.ServerApi.TransactionRecord

export interface TransactionFetchOptions {
  limit?: number
  cursor?: string
  order?: 'asc' | 'desc'
}

export async function fetchAccountTransactions(
  horizonServer: Horizon.Server,
  accountId: string,
  options: TransactionFetchOptions = {}
): Promise<Horizon.ServerApi.CollectionPage<TransactionRecord>> {
  const { limit = 50, cursor, order = 'desc' } = options

  try {
    let query = horizonServer.transactions().forAccount(accountId).limit(limit).order(order)

    if (cursor) {
      query = query.cursor(cursor)
    }

    const result = await query.call()
    log.info('Transactions fetched', {
      accountId: accountId.slice(0, 8),
      count: result.records.length,
      hasNext: !!result.next,
    })

    return result
  } catch (err) {
    const message = getErrorMessage(err, 'Failed to fetch account transactions')
    log.error(
      'Failed to fetch account transactions',
      err instanceof Error ? err : new Error(message)
    )
    throw err
  }
}

export async function fetchIncrementalTransactions(
  horizonServer: Horizon.Server,
  accountId: string,
  lastSeenId: string | null,
  limit: number = 50
): Promise<TransactionRecord[]> {
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
    const message = getErrorMessage(err, 'Failed to fetch incremental transactions')
    log.error(
      'Failed to fetch incremental transactions',
      err instanceof Error ? err : new Error(message)
    )
    throw err
  }
}

export async function getLatestTransaction(
  horizonServer: Horizon.Server,
  accountId: string
): Promise<TransactionRecord | null> {
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
    const message = getErrorMessage(err, 'Failed to get latest transaction')
    log.error('Failed to get latest transaction', err instanceof Error ? err : new Error(message))
    throw err
  }
}

export async function getTransactionById(
  horizonServer: Horizon.Server,
  transactionId: string
): Promise<TransactionRecord> {
  try {
    const tx = await horizonServer.transactions().transaction(transactionId).call()
    log.info('Transaction fetched by ID', { transactionId: transactionId.slice(0, 8) })
    return tx
  } catch (err) {
    const message = getErrorMessage(err, 'Failed to fetch transaction')
    log.error('Failed to fetch transaction by ID', err instanceof Error ? err : new Error(message))
    throw err
  }
}

/**
 * The cursor for the page after `page`: the paging token of its last record, which is exactly
 * what Horizon's `next` link encodes. (`page.next` itself is a function in the SDK, not a URL.)
 * `null` when the page is empty, so there is nothing to continue from.
 */
export function nextCursorFromPage(page: {
  records: ReadonlyArray<{ paging_token: string }>
}): string | null {
  const last = page.records[page.records.length - 1]
  return last ? last.paging_token : null
}

export function extractNextCursor(response: { next?: string | null }): string | null {
  if (!response.next) return null

  try {
    const url = new URL(response.next)
    return url.searchParams.get('cursor')
  } catch {
    return null
  }
}

// ─── Balances ────────────────────────────────────────────────────────────────

/** A Horizon balance line reduced to the fields the UI needs. */
export interface FormattedBalance {
  assetCode: string
  assetIssuer?: string
  balance: string
  assetType: 'native' | 'credit_alphanum4' | 'credit_alphanum12' | 'liquidity_pool_shares'
  isNative: boolean
}

/** Format a Horizon balance line into a more usable UI format. */
export const formatBalance = (balance: Horizon.HorizonApi.BalanceLine): FormattedBalance => {
  if (balance.asset_type === 'native') {
    return {
      assetCode: 'XLM',
      balance: balance.balance,
      assetType: 'native',
      isNative: true,
    }
  }

  const code = 'asset_code' in balance ? balance.asset_code : 'LP'
  const issuer = 'asset_issuer' in balance ? balance.asset_issuer : undefined

  return {
    assetCode: code,
    assetIssuer: issuer,
    balance: balance.balance,
    assetType: balance.asset_type as
      | 'credit_alphanum4'
      | 'credit_alphanum12'
      | 'liquidity_pool_shares',
    isNative: false,
  }
}

/**
 * Fetch an account's balances from Horizon, native XLM first.
 *
 * Throws when the account does not exist yet (Horizon 404) or the request
 * fails; callers decide whether that means "unfunded" or "retry later".
 */
export async function fetchAccountBalances(
  horizonServer: Horizon.Server,
  accountId: string
): Promise<FormattedBalance[]> {
  try {
    const account = await horizonServer.accounts().accountId(accountId).call()
    const balances = account.balances.map(formatBalance)
    balances.sort((a, b) => (a.isNative === b.isNative ? 0 : a.isNative ? -1 : 1))
    return balances
  } catch (err) {
    log.error(
      'Failed to fetch account balances',
      err instanceof Error ? err : new Error(String(err))
    )
    throw err
  }
}

/** HTTP status carried by a Horizon error response, when present. */
export function getHorizonErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined

  const response = (error as { response?: { status?: unknown } }).response
  return typeof response?.status === 'number' ? response.status : undefined
}

export const getBalanceCacheKey = (accountId: string): string =>
  `stellar-nebula:balance-cache:${accountId}`

/** Read the last-known balances for instant UI paint after a reload. */
export function loadCachedBalances(accountId: string): FormattedBalance[] | null {
  if (typeof window === 'undefined' || !accountId) return null
  try {
    const raw = localStorage.getItem(getBalanceCacheKey(accountId))
    if (!raw) return null
    return JSON.parse(raw) as FormattedBalance[]
  } catch {
    return null
  }
}

/** Persist balances so the next mount can render them before Horizon answers. */
export function saveCachedBalances(accountId: string, balances: FormattedBalance[]): void {
  if (typeof window === 'undefined' || !accountId) return
  try {
    if (balances.length === 0) {
      localStorage.removeItem(getBalanceCacheKey(accountId))
    } else {
      localStorage.setItem(getBalanceCacheKey(accountId), JSON.stringify(balances))
    }
  } catch {
    // Ignore quota errors
  }
}

export function parseTransactionResponse(
  tx: Horizon.HorizonApi.TransactionResponse | TransactionRecord
) {
  return {
    id: tx.id,
    hash: tx.hash,
    // A record from a call builder keeps the ledger number in `ledger_attr`
    // (`ledger` is then a link function); a raw response has it in `ledger`.
    ledger: 'ledger_attr' in tx ? tx.ledger_attr : tx.ledger,
    createdAt: new Date(tx.created_at),
    operationCount: tx.operation_count,
    sourceAccount: tx.source_account,
    // Horizon reports the fee actually charged as `fee_charged` (there is no `fee`).
    fee: Number(tx.fee_charged),
    successful: tx.successful,
  }
}
