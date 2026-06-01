import { useState, useCallback } from 'react'
import {
  isFreighterInstalled,
  connectFreighter,
  getFreighterNetwork,
  signTransactionWithFreighter,
} from '@services/wallets'
import type { WalletState, PublicKey, XDR } from '@/types'

const INITIAL_STATE: WalletState = {
  isConnected: false,
  publicKey: null,
  walletType: null,
  network: null,
}

/**
 * React hook for Freighter wallet integration.
 *
 * @example
 * const { walletState, connect, disconnect, signTransaction } = useFreighterWallet()
 */
export function useFreighterWallet() {
  const [walletState, setWalletState] = useState<WalletState>(INITIAL_STATE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const installed = await isFreighterInstalled()
      if (!installed) {
        throw new Error(
          'Freighter wallet is not installed. Visit https://www.freighter.app to install it.'
        )
      }
      const publicKey: PublicKey = await connectFreighter()
      const network = await getFreighterNetwork()
      setWalletState({ isConnected: true, publicKey, walletType: 'freighter', network })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setWalletState(INITIAL_STATE)
    setError(null)
  }, [])

  const signTransaction = useCallback(
    async (xdr: XDR): Promise<XDR | null> => {
      if (!walletState.isConnected || !walletState.network) {
        setError('Wallet is not connected')
        return null
      }
      setIsLoading(true)
      setError(null)
      try {
        const networkPassphrase =
          walletState.network === 'testnet'
            ? 'Test SDF Network ; September 2015'
            : 'Public Global Stellar Network ; September 2015'
        const signed = await signTransactionWithFreighter(
          xdr,
          networkPassphrase,
          walletState.publicKey ?? undefined
        )
        return signed
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sign transaction'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [walletState]
  )

  return { walletState, isLoading, error, connect, disconnect, signTransaction }
}
