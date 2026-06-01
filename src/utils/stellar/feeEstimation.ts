import * as StellarSdk from '@stellar/stellar-sdk'
import { createStellarRpcServer, getActiveStellarConfig } from '@/config/stellar'

export interface FeeEstimateInput {
  operationCount: number
  safetyBufferMultiplier?: number
}

export interface FeeEstimateResult {
  stroops: number
  xlm: string
  baseFeeStroops: number
  bufferMultiplier: number
  networkCondition: 'calm' | 'busy' | 'spiky'
}

function stroopsToXlm(stroops: number): string {
  return (stroops / 10_000_000).toFixed(7)
}

function extractNumericFee(stats: unknown): number | null {
  if (!stats || typeof stats !== 'object') return null

  const record = stats as Record<string, unknown>
  const candidates = [
    record.p95_inclusion_fee,
    record.p90_inclusion_fee,
    record.p50_inclusion_fee,
    record.p95,
    record.max_fee,
    record.max,
    record.fee_charged,
    record.fee,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return Math.ceil(candidate)
    }

    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>
      const nestedCandidates = [nested.p95, nested.max, nested.value, nested.amount]
      for (const nestedCandidate of nestedCandidates) {
        if (
          typeof nestedCandidate === 'number' &&
          Number.isFinite(nestedCandidate) &&
          nestedCandidate > 0
        ) {
          return Math.ceil(nestedCandidate)
        }
      }
    }
  }

  return null
}

function getNetworkCondition(baseFee: number): FeeEstimateResult['networkCondition'] {
  if (baseFee <= 100) return 'calm'
  if (baseFee <= 500) return 'busy'
  return 'spiky'
}

/**
 * Estimate the transaction fee before submission.
 *
 * Uses live RPC fee stats when available and falls back to the network minimum
 * so the UI can still render a stable preview when the stats endpoint is
 * unreachable.
 */
export async function estimateTransactionFee(input: FeeEstimateInput): Promise<FeeEstimateResult> {
  const config = getActiveStellarConfig()
  const rpcServer = createStellarRpcServer(config)

  let baseFeeStroops = 100

  try {
    const feeStats = await rpcServer.getFeeStats()
    const extracted = extractNumericFee(feeStats)
    if (extracted) {
      baseFeeStroops = Math.max(100, extracted)
    }
  } catch {
    // Keep the fallback minimum fee.
  }

  const operations = Math.max(1, input.operationCount)
  const safetyBufferMultiplier = input.safetyBufferMultiplier ?? 1.25
  const rawFee = baseFeeStroops * operations
  const bufferedFee = Math.ceil(rawFee * safetyBufferMultiplier)

  return {
    stroops: bufferedFee,
    xlm: stroopsToXlm(bufferedFee),
    baseFeeStroops,
    bufferMultiplier: safetyBufferMultiplier,
    networkCondition: getNetworkCondition(baseFeeStroops),
  }
}

/**
 * Convert stroops to the decimal XLM display format used in the UI.
 */
export function formatFeeInXlm(stroops: number): string {
  return `${stroopsToXlm(stroops)} XLM`
}

/**
 * Keep the exported namespace predictable for call sites that want the SDK
 * fallback minimum fee.
 */
export const MIN_TRANSACTION_FEE_STROOPS = StellarSdk.BASE_FEE
