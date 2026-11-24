import React, { useState, useCallback } from 'react'
import { useTransactionFee } from '@/hooks/useTransactionFee'
import { useWallet } from '@/contexts/WalletContext'
import { isTransactionLocked } from '@/services/stellar/transaction'
import { showError, showSuccess } from '@/utils/toast'
import { Spinner } from '@/components/UI/Spinner'
import type { CalculatedFee } from '@/utils/stellar-utils'
import type { ShipClass } from '@/types/game'

export interface ShipUpgradeProps {
  shipId?: string
  shipName?: string
  upgradeName?: string
  currentClass?: ShipClass
  targetClass?: ShipClass
  upgradeCost?: number
  operationCount?: number
  xlmPriceUsd?: number
  onConfirm?: (feeData: CalculatedFee) => void | Promise<void>
  onUpgrade?: (targetClass: ShipClass) => Promise<void> | void
  onCancel?: () => void
  disabled?: boolean
  isSubmitting?: boolean
  className?: string
}

export const ShipUpgrade: React.FC<ShipUpgradeProps> = ({
  shipId = 'ship-1',
  shipName = 'Stellar Explorer',
  upgradeName = 'Hyperdrive Mk II',
  currentClass,
  targetClass,
  upgradeCost,
  operationCount = 4, // Multi-operation batch by default (inspect, install, calibrate, certify)
  xlmPriceUsd = 0.12,
  onConfirm,
  onUpgrade,
  onCancel,
  disabled = false,
  isSubmitting = false,
  className = '',
}) => {
  const { isTransactionPending } = useWallet()
  const [internalUpgrading, setInternalUpgrading] = useState(false)

  const isPending = isTransactionPending || isSubmitting || internalUpgrading || isTransactionLocked()
  const isDisabled = disabled || isPending

  const {
    feeData,
    isLoading: isFeeLoading,
    isSpike,
    warning,
    fetchFee,
  } = useTransactionFee({
    initialOperationCount: operationCount,
    xlmPriceUsd,
  })

  // Fetch fee before proceeding with transaction
  const handleConfirm = useCallback(async () => {
    if (isPending) {
      showError('Transaction in progress. Please wait for completion.')
      return
    }

    try {
      setInternalUpgrading(true)
      // Acceptance criterion: Fee fetched from Horizon /fee_stats before each txn
      const latestFee = await fetchFee(operationCount, false)
      if (onConfirm) {
        await onConfirm(latestFee)
      }
      if (onUpgrade && targetClass) {
        await onUpgrade(targetClass)
        showSuccess(`Upgraded to ${targetClass.toUpperCase()} ship!`)
      }
    } catch (err) {
      console.error('Failed to prepare upgrade transaction:', err)
      const msg = err instanceof Error ? err.message : 'Upgrade failed'
      showError(msg)
    } finally {
      setInternalUpgrading(false)
    }
  }, [isPending, fetchFee, operationCount, onConfirm, onUpgrade, targetClass])

  const handleRefreshFee = useCallback(async () => {
    await fetchFee(operationCount, true)
  }, [fetchFee, operationCount])

  return (
    <div className={`ship-upgrade-container rounded-xl border border-space-600 bg-space-900 p-6 text-white shadow-xl max-w-lg mx-auto ${className}`}>
      <div className="border-b border-space-700 pb-4 mb-4">
        <span className="text-xs uppercase tracking-wider text-cosmic-cyan font-semibold">Ship Upgrade</span>
        <h2 className="text-xl font-bold mt-1 text-white">{upgradeName}</h2>
        <p className="text-sm text-gray-300 mt-1">
          Target Ship: {shipName} ({shipId})
          {currentClass && targetClass ? ` • ${currentClass} → ${targetClass}` : ''}
        </p>
      </div>

      <div className="upgrade-details space-y-3 mb-6">
        <div className="flex justify-between text-sm py-1 border-b border-space-800">
          <span className="text-gray-400">Operations in transaction:</span>
          <span className="font-semibold" data-testid="operation-count">{operationCount} operations</span>
        </div>

        {upgradeCost !== undefined && (
          <div className="flex justify-between text-sm py-1 border-b border-space-800">
            <span className="text-gray-400">Upgrade Cost:</span>
            <span className="font-mono text-cosmic-cyan font-semibold">{upgradeCost} XLM</span>
          </div>
        )}

        {/* Dynamic fee preview section */}
        <div className="fee-preview-box rounded-lg bg-space-800 p-4 border border-space-700">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold text-gray-200" id="fee-label">
              Estimated fee
            </span>
            <button
              type="button"
              onClick={handleRefreshFee}
              disabled={isFeeLoading || isDisabled}
              className="text-xs text-cosmic-cyan hover:underline disabled:opacity-50"
              aria-label="Refresh estimated fee"
            >
              Refresh fee
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-2" id="fee-explanation">
            Estimated fee: Final network fee may vary slightly depending on ledger network conditions.
          </p>

          {isFeeLoading ? (
            <div
              className="py-2 text-center text-cosmic-cyan text-sm flex items-center justify-center gap-2"
              data-testid="fee-loading"
              role="status"
              aria-live="polite"
            >
              <Spinner size="sm" />
              <span>Fetching current network fee from Horizon...</span>
            </div>
          ) : (
            <div className="fee-values flex items-baseline justify-between" data-testid="fee-display">
              <div>
                <span className="text-2xl font-bold text-white" data-testid="fee-xlm">
                  {feeData.totalFeeXlmFormatted}
                </span>
                <span className="text-xs text-gray-400 ml-2" data-testid="fee-formula">
                  ({operationCount} ops × {feeData.baseFeeStroops} stroops)
                </span>
              </div>
              <span className="text-sm text-gray-300 font-medium" data-testid="fee-usd">
                {feeData.totalFeeUsdFormatted}
              </span>
            </div>
          )}

          {/* Network fee spike warning */}
          {isSpike && (
            <div
              className="mt-3 p-3 rounded bg-amber-950/80 border border-amber-500 text-amber-200 text-xs flex items-start gap-2"
              role="alert"
              data-testid="fee-spike-warning"
            >
              <span className="text-base" aria-hidden="true">⚠️</span>
              <div>
                <strong className="block font-semibold">Fee Surge Warning</strong>
                <span>{warning || 'Network fee is currently >10x above normal rate. Consider delaying non-critical upgrades.'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="actions flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isDisabled}
            className="px-4 py-2 rounded-lg border border-space-600 bg-space-800 text-gray-300 hover:bg-space-700 text-sm font-medium transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isFeeLoading || isDisabled}
          aria-disabled={isFeeLoading || isDisabled}
          aria-busy={isPending}
          className="px-5 py-2 rounded-lg bg-cosmic-violet hover:bg-cosmic-purple text-white text-sm font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2"
          data-testid="confirm-upgrade-button"
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              <span>Processing Upgrade...</span>
            </>
          ) : (
            <span>Confirm Upgrade</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default ShipUpgrade
