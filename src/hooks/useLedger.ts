import { useCallback, useState, useEffect } from 'react'
import type { StellarNetwork } from '@/config/stellar'
import { createScopedLogger } from '@/services/logging'
import {
  connectLedger,
  disconnectLedger,
  isLedgerAvailable,
  signTransactionWithLedger,
} from '@/services/wallets/ledger'
import { getErrorMessage } from '@utils/error-messages'

const log = createScopedLogger('useLedger')

export interface LedgerConnectionState {
  isConnected: boolean
  publicKey: string | null
  isLoading: boolean
  error: string | null
}

export interface UseLedgerOptions {
  network?: StellarNetwork
  /** Reserved for a future on-device confirmation prompt; not used yet. */
  requiresConfirmation?: boolean
}

const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: 'Test SDF Network ; September 2015',
  futurenet: 'Test SDF Future Network ; October 2022',
  mainnet: 'Public Global Stellar Network ; September 2015',
}

/**
 * Ledger connection and signing state for components. All device access goes
 * through `@/services/wallets/ledger`, which uses `@ledgerhq/hw-app-str`.
 */
export function useLedger(options: UseLedgerOptions = {}) {
  const { network = 'testnet' } = options

  const [state, setState] = useState<LedgerConnectionState>({
    isConnected: false,
    publicKey: null,
    isLoading: false,
    error: null,
  })

  // Check Ledger availability
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const isSupported = await isLedgerAvailable()
      log.info('Ledger WebUSB support check', { isSupported })
      return isSupported
    } catch (err) {
      log.warn('Failed to check Ledger availability', {
        error: err instanceof Error ? err.message : String(err),
      })
      return false
    }
  }, [])

  // Connect to Ledger
  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const publicKey = await connectLedger()
      log.info('Connected to Ledger', { publicKey: publicKey.slice(0, 8) })

      setState({
        isConnected: true,
        publicKey,
        isLoading: false,
        error: null,
      })

      return publicKey
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to connect to Ledger')
      log.error('Ledger connection failed', err instanceof Error ? err : new Error(message))

      setState({
        isConnected: false,
        publicKey: null,
        isLoading: false,
        error: message,
      })

      throw err
    }
  }, [])

  // Disconnect from Ledger
  const disconnect = useCallback(async () => {
    try {
      await disconnectLedger()
      setState({
        isConnected: false,
        publicKey: null,
        isLoading: false,
        error: null,
      })

      log.info('Disconnected from Ledger')
    } catch (err) {
      log.warn('Error during Ledger disconnect', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }, [])

  // Sign a transaction on the device. Resolves to the signed transaction XDR.
  const signTransaction = useCallback(
    async (transactionXdr: string): Promise<string | null> => {
      if (!state.isConnected || !state.publicKey) {
        setState((prev) => ({
          ...prev,
          error: 'Ledger not connected. Please connect first.',
        }))
        return null
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const signedXdr = await signTransactionWithLedger(
          transactionXdr,
          NETWORK_PASSPHRASES[network],
          state.publicKey
        )

        log.info('Transaction signed with Ledger')
        setState((prev) => ({ ...prev, isLoading: false }))

        return signedXdr
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to sign transaction')
        log.error('Ledger signing failed', err instanceof Error ? err : new Error(message))

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }))

        throw err
      }
    },
    [state.isConnected, state.publicKey, network]
  )

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // Check availability on mount
  useEffect(() => {
    void checkAvailability()
  }, [checkAvailability])

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
    clearError,
    checkAvailability,
  }
}
