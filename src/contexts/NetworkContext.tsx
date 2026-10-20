import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { StellarNetwork } from '@/config/stellar'
import { getActiveStellarConfig } from '@/config/stellar'
import { createScopedLogger } from '@/services/logging'
import { trackEvent } from '@/services/analytics'
import { getErrorMessage } from '@utils/error-messages'

const log = createScopedLogger('NetworkContext')

export interface NetworkContextValue {
  currentNetwork: StellarNetwork
  switchNetwork: (network: StellarNetwork) => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export const NetworkContext = createContext<NetworkContextValue | null>(null)

interface NetworkProviderProps {
  children: ReactNode
  defaultNetwork?: StellarNetwork
}

const NETWORK_STORAGE_KEY = 'stellar-nebula:network'

function loadPersistedNetwork(): StellarNetwork | null {
  try {
    const stored = localStorage.getItem(NETWORK_STORAGE_KEY)
    return stored as StellarNetwork | null
  } catch {
    return null
  }
}

function persistNetwork(network: StellarNetwork): void {
  try {
    localStorage.setItem(NETWORK_STORAGE_KEY, network)
  } catch {
    // Ignore quota errors
  }
}

export function NetworkProvider({
  children,
  defaultNetwork = 'testnet',
}: NetworkProviderProps) {
  const [currentNetwork, setCurrentNetwork] = useState<StellarNetwork>(() => {
    const persisted = loadPersistedNetwork()
    return persisted || defaultNetwork
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const switchNetwork = useCallback(
    async (network: StellarNetwork) => {
      if (network === currentNetwork) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        log.info('Switching network', { network })

        // Verify network config exists
        const config = getActiveStellarConfig({ STELLAR_NETWORK: network })
        if (!config) {
          throw new Error(`Invalid network: ${network}`)
        }

        // Clear application state for network switch
        try {
          localStorage.removeItem('stellar-nebula:tx-cache')
          localStorage.removeItem('stellar-nebula:wallet')
        } catch {
          // Ignore
        }

        setCurrentNetwork(network)
        persistNetwork(network)

        log.info('Network switched successfully', { network })

        trackEvent('network_switched', {
          newNetwork: network,
          previousNetwork: currentNetwork,
        })
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to switch network')
        log.error('Network switch failed', err instanceof Error ? err : new Error(message))
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [currentNetwork]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = useMemo<NetworkContextValue>(
    () => ({
      currentNetwork,
      switchNetwork,
      isLoading,
      error,
      clearError,
    }),
    [currentNetwork, switchNetwork, isLoading, error, clearError]
  )

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext)
  if (!ctx) {
    throw new Error('useNetwork must be used inside <NetworkProvider>')
  }
  return ctx
}
