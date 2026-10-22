import { useCallback } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { isWalletConnectConfigured } from '@config/walletconnect'
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
 * WalletConnect flow for mobile wallets (#458).
 *
 * Session creation, QR/deep-link display and signing live in
 * `services/wallets/walletconnect.ts`; this hook adapts them to the global
 * wallet state so the modal and the header stay in sync with Freighter/Albedo.
 */
export function useWalletConnect(): UseWalletConnectReturn {
  const { walletState, connect, disconnect, signTransaction, isLoading, error, clearError } =
    useWallet()

  const isConnected = walletState.isConnected && walletState.walletType === 'walletconnect'

  const connectWallet = useCallback(async () => {
    await connect('walletconnect')
  }, [connect])

  const signWithWalletConnect = useCallback(
    async (xdr: XDR): Promise<XDR | null> => {
      if (!isConnected) return null
      return signTransaction(xdr)
    },
    [isConnected, signTransaction]
  )

  return {
    isAvailable: true,
    isConfigured: isWalletConnectConfigured(),
    isConnected,
    isConnecting: isLoading,
    publicKey: isConnected ? walletState.publicKey : null,
    network: isConnected ? walletState.network : null,
    error,
    connect: connectWallet,
    disconnect,
    signTransaction: signWithWalletConnect,
    clearError,
  }
}
