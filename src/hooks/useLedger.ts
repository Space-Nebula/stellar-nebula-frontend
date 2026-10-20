import { useCallback, useState, useEffect } from 'react'
import type { StellarNetwork } from '@/config/stellar'
import { createScopedLogger } from '@/services/logging'
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
  requiresConfirmation?: boolean
}

export function useLedger(options: UseLedgerOptions = {}) {
  const { network = 'testnet', requiresConfirmation = false } = options

  const [state, setState] = useState<LedgerConnectionState>({
    isConnected: false,
    publicKey: null,
    isLoading: false,
    error: null,
  })

  // Check Ledger availability
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const TransportWebUSB =
        (await import('@ledgerhq/hw-transport-webusb').then((m) => m.default)) || null

      if (!TransportWebUSB) {
        log.warn('Ledger WebUSB transport not available')
        return false
      }

      const isSupported = await TransportWebUSB.isSupported()
      log.info('Ledger WebUSB support check', { isSupported })
      return isSupported
    } catch (err) {
      log.warn('Failed to check Ledger availability', err instanceof Error ? err : new Error(String(err)))
      return false
    }
  }, [])

  // Connect to Ledger
  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const TransportWebUSB =
        (await import('@ledgerhq/hw-transport-webusb').then((m) => m.default)) || null

      if (!TransportWebUSB) {
        throw new Error('Ledger WebUSB transport not available in this browser')
      }

      const transport = await TransportWebUSB.create()
      const Str = await import('@stellar/ledger-sdk').then((m) => m.default)

      if (!Str) {
        throw new Error('Stellar Ledger SDK not available')
      }

      const stellar = new Str(transport)
      const result = await stellar.getPublicKey("44'/148'/0'")

      const publicKey = result.publicKey
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
      setState({
        isConnected: false,
        publicKey: null,
        isLoading: false,
        error: null,
      })

      log.info('Disconnected from Ledger')
    } catch (err) {
      log.warn('Error during Ledger disconnect', err instanceof Error ? err : new Error(String(err)))
    }
  }, [])

  // Sign transaction
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
        const TransportWebUSB =
          (await import('@ledgerhq/hw-transport-webusb').then((m) => m.default)) || null

        if (!TransportWebUSB) {
          throw new Error('Ledger WebUSB transport not available')
        }

        const transport = await TransportWebUSB.create()
        const Str = await import('@stellar/ledger-sdk').then((m) => m.default)

        if (!Str) {
          throw new Error('Stellar Ledger SDK not available')
        }

        const stellar = new Str(transport)
        const passphraseMap: Record<StellarNetwork, string> = {
          testnet: 'Test SDF Network ; September 2015',
          futurenet: 'Test SDF Future Network ; October 2022',
          mainnet: 'Public Global Stellar Network ; September 2015',
        }

        const result = await stellar.signTransaction(
          "44'/148'/0'",
          transactionXdr,
          passphraseMap[network]
        )

        log.info('Transaction signed with Ledger')
        setState((prev) => ({ ...prev, isLoading: false }))

        return result.signature
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
