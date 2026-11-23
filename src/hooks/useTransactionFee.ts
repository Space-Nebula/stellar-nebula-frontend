/**
 * Hook to dynamically calculate, fetch, and cache Stellar transaction fees.
 */

import { useState, useCallback } from 'react'
import { fetchHorizonFeeStats } from '@/services/stellar/fee-service'
import {
  calculateTransactionFee,
  NORMAL_BASE_FEE_STROOPS,
  DEFAULT_XLM_PRICE_USD,
  type CalculatedFee,
} from '@/utils/stellar-utils'

export interface UseTransactionFeeOptions {
  initialOperationCount?: number
  xlmPriceUsd?: number
}

export interface UseTransactionFeeResult {
  feeData: CalculatedFee
  isLoading: boolean
  isSpike: boolean
  warning: string | null
  error: string | null
  fetchFee: (operationCount?: number, forceRefresh?: boolean) => Promise<CalculatedFee>
  setOperationCount: (operationCount: number) => void
}

export function useTransactionFee(options: UseTransactionFeeOptions = {}): UseTransactionFeeResult {
  const { initialOperationCount = 1, xlmPriceUsd = DEFAULT_XLM_PRICE_USD } = options

  const [operationCount, setOperationCountState] = useState<number>(initialOperationCount)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [feeData, setFeeData] = useState<CalculatedFee>(() =>
    calculateTransactionFee(NORMAL_BASE_FEE_STROOPS, initialOperationCount, xlmPriceUsd)
  )

  const fetchFee = useCallback(
    async (targetOpCount?: number, forceRefresh: boolean = false): Promise<CalculatedFee> => {
      const ops = targetOpCount !== undefined ? targetOpCount : operationCount
      setIsLoading(true)
      setError(null)

      try {
        const stats = await fetchHorizonFeeStats({ forceRefresh })
        const calculated = calculateTransactionFee(stats.baseFeeStroops, ops, xlmPriceUsd)
        setFeeData(calculated)
        return calculated
      } catch (err) {
        const fallbackMsg = 'Failed to fetch current network fee; using standard base fee.'
        setError(fallbackMsg)
        const fallbackCalc = calculateTransactionFee(NORMAL_BASE_FEE_STROOPS, ops, xlmPriceUsd)
        setFeeData(fallbackCalc)
        return fallbackCalc
      } finally {
        setIsLoading(false)
      }
    },
    [operationCount, xlmPriceUsd]
  )

  const setOperationCount = useCallback(
    (newOps: number) => {
      setOperationCountState(newOps)
      setFeeData((prev) => calculateTransactionFee(prev.baseFeeStroops, newOps, xlmPriceUsd))
    },
    [xlmPriceUsd]
  )

  const warning = feeData.isSpike
    ? 'Network fee is currently higher than normal (>10x). Network congestion may be elevated.'
    : null

  return {
    feeData,
    isLoading,
    isSpike: feeData.isSpike,
    warning,
    error,
    fetchFee,
    setOperationCount,
  }
}
