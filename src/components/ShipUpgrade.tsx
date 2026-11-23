import { useState, useCallback } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { isTransactionLocked } from '@/services/stellar/transaction'
import { Spinner } from '@/components/UI/Spinner'
import { showError, showSuccess } from '@/utils/toast'
import type { ShipClass } from '@/types/game'

export interface ShipUpgradeProps {
  shipId?: string
  currentClass: ShipClass
  targetClass: ShipClass
  upgradeCost: number
  onUpgrade?: (targetClass: ShipClass) => Promise<void> | void
  disabled?: boolean
  className?: string
}

/**
 * ShipUpgrade component with transaction gating (#545).
 * Disables interactions and shows loading state when a transaction is pending,
 * preventing race conditions and duplicate Stellar transactions.
 */
export function ShipUpgrade({
  currentClass,
  targetClass,
  upgradeCost,
  onUpgrade,
  disabled = false,
  className = '',
}: ShipUpgradeProps) {
  const { isTransactionPending } = useWallet()
  const [isUpgrading, setIsUpgrading] = useState(false)

  const isPending = isTransactionPending || isUpgrading || isTransactionLocked()
  const isDisabled = disabled || isPending

  const handleUpgrade = useCallback(async () => {
    if (isPending) {
      showError('Transaction in progress. Please wait for completion.')
      return
    }

    try {
      setIsUpgrading(true)
      if (onUpgrade) {
        await onUpgrade(targetClass)
      }
      showSuccess(`Upgraded to ${targetClass.toUpperCase()} ship!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upgrade failed'
      showError(msg)
    } finally {
      setIsUpgrading(false)
    }
  }, [isPending, onUpgrade, targetClass])

  return (
    <div className={`ship-upgrade-card p-4 rounded-xl border border-space-800 bg-space-900/60 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-space-400">Upgrade Available</span>
          <h3 className="text-lg font-bold text-white capitalize">{targetClass} Class</h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-space-400">Cost</span>
          <p className="font-mono text-cosmic-cyan font-semibold">{upgradeCost} XLM</p>
        </div>
      </div>

      <button
        type="button"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isPending}
        onClick={() => void handleUpgrade()}
        className={`w-full py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed bg-space-800 text-space-400'
            : 'bg-gradient-to-r from-cosmic-cyan to-blue-500 text-space-950 hover:brightness-110 active:scale-98'
        }`}
      >
        {isPending && <Spinner size="sm" />}
        <span>
          {isPending ? 'Confirming Upgrade…' : `Upgrade from ${currentClass}`}
        </span>
      </button>
    </div>
  )
}

export default ShipUpgrade
