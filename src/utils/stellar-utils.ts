/**
 * Stellar utility functions for fee calculation, formatting, and conversion.
 */

export const STROOPS_PER_XLM = 10_000_000
export const NORMAL_BASE_FEE_STROOPS = 100 // 0.00001 XLM standard base fee
export const DEFAULT_XLM_PRICE_USD = 0.12 // Fallback XLM/USD exchange rate

export interface CalculatedFee {
  baseFeeStroops: number
  operationCount: number
  totalFeeStroops: number
  totalFeeXlm: number
  totalFeeXlmFormatted: string
  totalFeeUsd: number
  totalFeeUsdFormatted: string
  isSpike: boolean
}

/**
 * Convert stroops (1/10,000,000 XLM) to XLM.
 */
export function stroopsToXlm(stroops: number): number {
  return stroops / STROOPS_PER_XLM
}

/**
 * Convert XLM to stroops.
 */
export function xlmToStroops(xlm: number): number {
  return Math.round(xlm * STROOPS_PER_XLM)
}

/**
 * Format XLM amount with 7 decimal precision (standard for Stellar).
 */
export function formatXlmFee(stroops: number): string {
  const xlm = stroopsToXlm(stroops)
  return `${xlm.toFixed(7)} XLM`
}

/**
 * Format USD fee equivalent.
 */
export function formatUsdFee(xlmAmount: number, xlmPriceUsd: number = DEFAULT_XLM_PRICE_USD): string {
  const usd = xlmAmount * xlmPriceUsd
  if (usd < 0.01) {
    return `<$0.01 USD`
  }
  return `$${usd.toFixed(4)} USD`
}

/**
 * Check if a base fee represents a fee spike (>10x the normal 100 stroop base fee).
 */
export function isFeeSpike(baseFeeStroops: number, normalBaseFee: number = NORMAL_BASE_FEE_STROOPS): boolean {
  return baseFeeStroops > normalBaseFee * 10
}

/**
 * Calculate dynamic transaction fee based on base fee and operation count:
 * fee = base_fee * operation_count
 */
export function calculateTransactionFee(
  baseFeeStroops: number,
  operationCount: number = 1,
  xlmPriceUsd: number = DEFAULT_XLM_PRICE_USD
): CalculatedFee {
  const safeOps = Math.max(1, Math.floor(operationCount))
  const safeBaseFee = Math.max(NORMAL_BASE_FEE_STROOPS, Math.floor(baseFeeStroops))
  const totalFeeStroops = safeBaseFee * safeOps
  const totalFeeXlm = stroopsToXlm(totalFeeStroops)
  const totalFeeUsd = totalFeeXlm * xlmPriceUsd
  const spike = isFeeSpike(safeBaseFee)

  return {
    baseFeeStroops: safeBaseFee,
    operationCount: safeOps,
    totalFeeStroops,
    totalFeeXlm,
    totalFeeXlmFormatted: formatXlmFee(totalFeeStroops),
    totalFeeUsd,
    totalFeeUsdFormatted: formatUsdFee(totalFeeXlm, xlmPriceUsd),
    isSpike: spike,
  }
}
