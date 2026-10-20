import { useCallback, useEffect, useState } from 'react'
import type { Transaction } from '@stellar/stellar-sdk'
import { BASE_FEE } from '@stellar/stellar-sdk'
import {
  calculateFeeBreakdown,
  getDetailedFeeEstimate,
  type DetailedFeeEstimate,
} from '@/utils/fee-calculator'
import { createScopedLogger } from '@/services/logging'
import { getErrorMessage } from '@utils/error-messages'

const log = createScopedLogger('useFeeEstimation')

export interface FeeEstimationState {
  estimate: DetailedFeeEstimate | null
  isLoading: boolean
  error: string | null
}

interface UseFeeEstimationOptions {
  networkRate?: number
  autoEstimate?: boolean
}

export function useFeeEstimation(
  transaction: Transaction | null,
  options: UseFeeEstimationOptions = {}
): FeeEstimationState & {
  estimateFee: () => void
  clearError: () => void
} {
  const { networkRate = BASE_FEE, autoEstimate = true } = options

  const [state, setState] = useState<FeeEstimationState>({
    estimate: null,
    isLoading: false,
    error: null,
  })

  const estimateFee = useCallback(() => {
    if (!transaction) {
      setState((prev) => ({ ...prev, error: 'No transaction provided' }))
      return
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      const breakdown = calculateFeeBreakdown(transaction)
      log.info('Fee breakdown calculated', {
        operationCount: breakdown.operationCount,
        totalFee: breakdown.totalFee,
      })

      const estimate = getDetailedFeeEstimate(transaction, networkRate)
      setState({
        estimate,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to estimate fee')
      log.error('Fee estimation failed', err instanceof Error ? err : new Error(message))
      setState({
        estimate: null,
        isLoading: false,
        error: message,
      })
    }
  }, [transaction, networkRate])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  useEffect(() => {
    if (autoEstimate && transaction) {
      estimateFee()
    }
  }, [transaction, autoEstimate, estimateFee])

  return {
    ...state,
    estimateFee,
    clearError,
  }
}
