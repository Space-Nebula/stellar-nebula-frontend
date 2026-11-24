import { useCallback, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { isWalletConnectConfigured } from '@config/walletconnect'
import { isTransactionLocked, acquireTransactionLock, releaseTransactionLock } from '@/services/stellar/transaction'
import { showError } from '@/utils/toast'
import type { PublicKey, StellarNetwork, XDR } from '@/types'

export interface UseWalletConnectReturn {
  /** Whether the WalletConnect SDK can run in this browser. */
  isAvailable: boolean
  /** Whether VITE_WALLETCONNECT_PROJECT_ID is set. */
  isConfigured: boolean
  /** Whether the active wallet is a WalletConnect session. */
  isConnected: boolean
  /** True while the pairing/approval flow is running. */
  isConnecting: boolean
  /** Whether a transaction is currently being processed or locked (#545). */
  isTransactionPending: boolean
  /** Whether the transaction execution lock is active (#545). */
  isTransactionLocked: boolean
  publicKey: PublicKey | null
  network: StellarNetwork | null
  error: string | null
  /** Open the WalletConnect QR modal and wait for mobile approval. */
  connect: () => Promise<void>
  /** End the session and clear the persisted pairing. */
  disconnect: () => void
  /** Sign through the active WalletConnect session. */
  signTransaction: (xdr: XDR) => Promise<XDR | null>
  /** Dismiss the current error. */
  clearError: () => void
}

/**
 * WalletConnect flow for mobile wallets with transaction race condition protection (#545).
 * Gated by a transaction lock and queue to prevent duplicate submissions from rapid clicks.
 */
export function useWalletConnect(): UseWalletConnectReturn {
  const {
    walletState,
    connect,
    disconnect,
    signTransaction,
    isLoading,
    isTransactionPending: contextPending,
    error,
    clearError,
  } = useWallet()

  const [localLocked, setLocalLocked] = useState(false)
  const isConnected = walletState.isConnected && walletState.walletType === 'walletconnect'
  const isPending = contextPending || localLocked || isTransactionLocked()

  const connectWallet = useCallback(async () => {
    await connect('walletconnect')
  }, [connect])

  const signWithWalletConnect = useCallback(
    async (xdr: XDR): Promise<XDR | null> => {
      if (!isConnected) return null

      if (isPending) {
        showError('Transaction already in progress. Please wait for confirmation.')
        return null
      }

      if (!acquireTransactionLock()) {
        showError('Transaction in progress. Please wait.')
        return null
      }

      setLocalLocked(true)
      try {
        return await signTransaction(xdr)
      } finally {
        setLocalLocked(false)
        releaseTransactionLock()
      }
    },
    [isConnected, isPending, signTransaction]
  )

  return {
    isAvailable: true,
    isConfigured: isWalletConnectConfigured(),
    isConnected,
    isConnecting: isLoading,
    isTransactionPending: isPending,
    isTransactionLocked: localLocked || isTransactionLocked(),
    publicKey: isConnected ? walletState.publicKey : null,
    network: isConnected ? walletState.network : null,
    error,
    connect: connectWallet,
    disconnect,
    signTransaction: signWithWalletConnect,
    clearError,
  }
}

export default useWalletConnect
