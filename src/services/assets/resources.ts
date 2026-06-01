import type { Horizon } from '@stellar/stellar-sdk'
import { createHorizonServer, getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'

export interface ResourceAssetBalance {
  code: string
  issuer?: string
  balance: string
  assetType: string
}

export interface ResourceAssetSnapshot {
  accountId: string
  balances: ResourceAssetBalance[]
  fetchedAt: string
}

interface CacheEnvelope {
  expiresAt: number
  snapshot: ResourceAssetSnapshot | null
}

const CACHE_TTL_MS = 15_000

function getCacheKey(accountId: string): string {
  return `stellar-nebula:resource-snapshot:${accountId}`
}

function readCache(accountId: string): ResourceAssetSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getCacheKey(accountId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEnvelope
    if (Date.now() > parsed.expiresAt) return null
    return parsed.snapshot
  } catch {
    return null
  }
}

function writeCache(accountId: string, snapshot: ResourceAssetSnapshot | null): void {
  if (typeof window === 'undefined') return
  try {
    const envelope: CacheEnvelope = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      snapshot,
    }
    window.localStorage.setItem(getCacheKey(accountId), JSON.stringify(envelope))
  } catch {
    // Ignore storage failures.
  }
}

function mapBalance(balance: Horizon.HorizonApi.BalanceLine): ResourceAssetBalance {
  return {
    code:
      balance.asset_type === 'native'
        ? 'XLM'
        : ((balance as { asset_code?: string }).asset_code ?? 'UNKNOWN'),
    issuer:
      balance.asset_type === 'native'
        ? undefined
        : (balance as { asset_issuer?: string }).asset_issuer,
    balance: balance.balance,
    assetType: balance.asset_type,
  }
}

/**
 * Fetch a snapshot of all asset balances for a Stellar account.
 *
 * Results are cached in localStorage for 15 seconds.
 *
 * @param accountId - The Stellar public key
 * @param config    - Optional network config override
 * @param options.forceRefresh - Bypass the local cache
 *
 * @example
 * const snapshot = await fetchResourceAssetSnapshot('G...')
 */
export async function fetchResourceAssetSnapshot(
  accountId: string,
  config?: StellarNetworkConfig,
  options: { forceRefresh?: boolean } = {}
): Promise<ResourceAssetSnapshot> {
  if (!options.forceRefresh) {
    const cached = readCache(accountId)
    if (cached !== null) return cached
  }

  const horizon = createHorizonServer(config ?? getActiveStellarConfig())
  const response = await horizon.accounts().accountId(accountId).call()

  const snapshot: ResourceAssetSnapshot = {
    accountId,
    balances: response.balances.map(mapBalance),
    fetchedAt: new Date().toISOString(),
  }

  writeCache(accountId, snapshot)
  return snapshot
}
