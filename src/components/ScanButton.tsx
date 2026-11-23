import { useState, useCallback, useRef } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { isTransactionLocked } from '@/services/stellar/transaction'
import { Spinner } from '@/components/UI/Spinner'
import { showError } from '@/utils/toast'

export interface ScanButtonProps {
  onScan: () => Promise<void> | void
  disabled?: boolean
  label?: string
  scanningLabel?: string
  className?: string
  debounceMs?: number
}

/**
 * ScanButton component with debounce and pending transaction protection (#545).
 * Disables clicks during pending operations to prevent duplicate transactions.
 */
export function ScanButton({
  onScan,
  disabled = false,
  label = 'Scan Anomaly',
  scanningLabel = 'Scanning…',
  className = '',
  debounceMs = 500,
}: ScanButtonProps) {
  const { isTransactionPending } = useWallet()
  const [isScanning, setIsScanning] = useState(false)
  const lastClickRef = useRef<number>(0)

  const isPending = isTransactionPending || isScanning || isTransactionLocked()
  const isDisabled = disabled || isPending

  const handleClick = useCallback(async () => {
    const now = Date.now()
    if (now - lastClickRef.current < debounceMs) {
      // Debounce window active
      return
    }
    lastClickRef.current = now

    if (isPending) {
      showError('Transaction in progress. Please wait.')
      return
    }

    try {
      setIsScanning(true)
      await onScan()
    } finally {
      setIsScanning(false)
    }
  }, [debounceMs, isPending, onScan])

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={isPending}
      onClick={() => void handleClick()}
      className={`scan-button inline-flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg transition-all ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed bg-space-800 text-space-400'
          : 'bg-cosmic-cyan text-space-950 hover:bg-cyan-400 active:scale-95'
      } ${className}`}
    >
      {isPending && <Spinner size="sm" />}
      <span>{isPending ? scanningLabel : label}</span>
    </button>
  )
}

export default ScanButton
