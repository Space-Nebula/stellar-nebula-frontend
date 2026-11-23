/**
 * Service to fetch and cache network fee stats from Horizon API.
 */

import { getActiveStellarConfig } from '@/config/stellar'
import { NORMAL_BASE_FEE_STROOPS, isFeeSpike } from '@/utils/stellar-utils'

export interface HorizonFeeStatsResponse {
  last_ledger_base_fee?: string | number
  last_ledger?: string | number
  fee_charged?: {
    max?: string | number
    min?: string | number
    mode?: string | number
    p10?: string | number
    p50?: string | number
    p90?: string | number
    p95?: string | number
  }
  max_fee?: {
    mode?: string | number
    p50?: string | number
  }
}

export interface CachedFeeData {
  baseFeeStroops: number
  isSpike: boolean
  timestamp: number
  raw?: HorizonFeeStatsResponse
}

export const FEE_CACHE_TTL_MS = 60_000 // 60 seconds TTL

let feeCache: CachedFeeData | null = null

/**
 * Clear the in-memory fee cache (useful for testing or forcing fresh fetch).
 */
export function clearFeeCache(): void {
  feeCache = null
}

/**
 * Extract numeric base fee from Horizon /fee_stats response.
 * Uses last_ledger_base_fee or mode/p50 from fee_charged, falling back to 100 stroops.
 */
export function extractBaseFeeFromStats(stats: HorizonFeeStatsResponse): number {
  if (stats.last_ledger_base_fee !== undefined) {
    const parsed = Number(stats.last_ledger_base_fee)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  if (stats.fee_charged?.mode !== undefined) {
    const parsed = Number(stats.fee_charged.mode)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  if (stats.fee_charged?.p50 !== undefined) {
    const parsed = Number(stats.fee_charged.p50)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return NORMAL_BASE_FEE_STROOPS
}

/**
 * Fetch fee stats from Horizon API (/fee_stats) with 60-second caching.
 */
export async function fetchHorizonFeeStats(options: { forceRefresh?: boolean } = {}): Promise<CachedFeeData> {
  const now = Date.now()

  if (!options.forceRefresh && feeCache && now - feeCache.timestamp < FEE_CACHE_TTL_MS) {
    return feeCache
  }

  let baseFee = NORMAL_BASE_FEE_STROOPS
  let rawStats: HorizonFeeStatsResponse | undefined

  try {
    const config = getActiveStellarConfig()
    const horizonUrl = (config?.horizonUrl || 'https://horizon-testnet.stellar.org').replace(/\/$/, '')
    const endpoint = `${horizonUrl}/fee_stats`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.ok) {
      rawStats = (await response.json()) as HorizonFeeStatsResponse
      baseFee = extractBaseFeeFromStats(rawStats)
    } else {
      console.warn(`[fee-service] Horizon fee_stats returned status ${response.status}; using default base fee.`)
    }
  } catch (error) {
    console.warn('[fee-service] Failed to fetch fee_stats from Horizon; using default base fee.', error)
  }

  const cachedData: CachedFeeData = {
    baseFeeStroops: baseFee,
    isSpike: isFeeSpike(baseFee),
    timestamp: now,
    raw: rawStats,
  }

  feeCache = cachedData
  return cachedData
}

/**
 * Get current base fee in stroops.
 */
export async function getCurrentBaseFee(forceRefresh: boolean = false): Promise<number> {
  const stats = await fetchHorizonFeeStats({ forceRefresh })
  return stats.baseFeeStroops
}
