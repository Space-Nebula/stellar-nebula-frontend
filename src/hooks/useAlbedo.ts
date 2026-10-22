import { useCallback, useState } from 'react'
import {
  connectAlbedo,
  getAlbedoNetwork,
  isAlbedoAvailable,
  signTransactionWithAlbedo,
} from '@services/wallets'
import { getErrorMessage } from '@utils/error-messages'
import { SIGNING_TIMEOUT_MESSAGE, SIGNING_TIMEOUT_MS, withTimeout } from '@utils/stellar/timeout'
import type { PublicKey, StellarNetwork, XDR } from '@/types'

/** Network passphrases Albedo needs in order to sign for each supported network. */
export const ALBEDO_NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: 'Test SDF Network ; September 2015',
  futurenet: 'Test SDF Future Network ; October 2022',
  mainnet: 'Public Global Stellar Network ; September 2015',
}

export interface UseAlbedoReturn {
  /** Whether the browser can open the Albedo popup. */
  isAvailable: boolean
  /** Whether a public key has been obtained from Albedo. */
  isConnected: boolean
  /** Connected Stellar account, or null before connecting. */
  publicKey: PublicKey | null
  /** Network reported by Albedo after connecting. */
  network: StellarNetwork | null
  /** True while a connect or sign request is in flight. */
  isLoading: boolean
  /** Last actionable error, or null. */
  error: string | null
  /** Open the Albedo popup and request the user's public key. */
  connect: () => Promise<PublicKey | null>
  /** Forget the in-memory connection (Albedo keeps its own session). */
  disconnect: () => void
  /** Sign a transaction XDR. Returns null and sets `error` on failure. */
  signTransaction: (xdr: XDR, network?: StellarNetwork) => Promise<XDR | null>
  /** Clear the last error. */
  clearError: () => void
}

/**
 * React hook for the Albedo web wallet.
 *
 * Albedo has no injected extension: every request opens a popup intent. The
 * hook therefore guards each request with the shared signing timeout so a
 * closed or blocked popup cannot leave the UI hanging forever.
 *
 * @example
 * const { connect, signTransaction, publicKey, error } = useAlbedo()
 * await connect()
 * const signed = await signTransaction(xdr)
 */
export function useAlbedo(): UseAlbedoReturn {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  const [network, setNetwork] = useState<StellarNetwork | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAvailable = isAlbedoAvailable()

  const connect = useCallback(async (): Promise<PublicKey | null> => {
    if (!isAlbedoAvailable()) {
      setError('Albedo is not available in this browser. Use a browser that allows popups.')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const key = await withTimeout(connectAlbedo(), SIGNING_TIMEOUT_MS, SIGNING_TIMEOUT_MESSAGE)
      const detectedNetwork = await getAlbedoNetwork()

      setPublicKey(key)
      setNetwork(detectedNetwork)
      return key
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to connect to Albedo'))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setPublicKey(null)
    setNetwork(null)
    setError(null)
  }, [])

  const signTransaction = useCallback(
    async (xdr: XDR, targetNetwork?: StellarNetwork): Promise<XDR | null> => {
      const signingNetwork = targetNetwork ?? network

      if (!publicKey || !signingNetwork) {
        setError('Connect Albedo before signing a transaction.')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        return await withTimeout(
          signTransactionWithAlbedo(xdr, ALBEDO_NETWORK_PASSPHRASES[signingNetwork]),
          SIGNING_TIMEOUT_MS,
          SIGNING_TIMEOUT_MESSAGE
        )
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to sign transaction with Albedo'))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [network, publicKey]
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    isAvailable,
    isConnected: Boolean(publicKey),
    publicKey,
    network,
    isLoading,
    error,
    connect,
    disconnect,
    signTransaction,
    clearError,
  }
}
