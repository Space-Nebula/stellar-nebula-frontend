import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  connectFreighter,
  connectAlbedo,
  getFreighterNetwork,
  isFreighterInstalled,
  isAlbedoAvailable,
  signTransactionWithFreighter,
  signTransactionWithAlbedo,
} from '@services/wallets'
import type { WalletState, WalletType, XDR, StellarNetwork } from '@/types'
import { createScopedLogger } from '@/services/logging'
import { addMonitoringBreadcrumb, setMonitoringUser, clearMonitoringUser } from '@/services/monitoring'
import { trackEvent } from '@/services/analytics'

const log = createScopedLogger('WalletContext')

// ─── Storage key ─────────────────────────────────────────────────────────────

const WALLET_STORAGE_KEY = 'stellar-nebula:wallet'

interface PersistedWallet {
  publicKey: string
  walletType: WalletType
  network: StellarNetwork
}

// ─── Context shape ────────────────────────────────────────────────────────────

export interface WalletContextValue {
  walletState: WalletState
  isLoading: boolean
  error: string | null
  isReconnecting: boolean
  reconnectError: string | null
  isFreighterInstalled: boolean
  isAlbedoAvailable: boolean
  connect: (type: WalletType) => Promise<void>
  disconnect: () => void
  switchWallet: (type: WalletType) => Promise<void>
  signTransaction: (xdr: XDR) => Promise<XDR | null>
  clearError: () => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL_WALLET_STATE: WalletState = {
  isConnected: false,
  publicKey: null,
  walletType: null,
  network: null,
}

function loadPersistedWallet(): PersistedWallet | null {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedWallet) : null
  } catch {
    return null
  }
}

function persistWallet(wallet: PersistedWallet): void {
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet))
  } catch {
    // Ignore quota / private-browsing errors
  }
}

function clearPersistedWallet(): void {
  try {
    localStorage.removeItem(WALLET_STORAGE_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Validates if a persisted wallet session is still active.
 * Checks if the wallet extension is still installed and can provide the public key.
 */
async function validateWalletSession(persisted: PersistedWallet): Promise<WalletState | null> {
  try {
    if (persisted.walletType === 'freighter') {
      const installed = await isFreighterInstalled()
      if (!installed) return null

      // Attempt to get the public key and network to ensure the wallet is still connected.
      // If the wallet has been switched or disconnected, do not reuse the persisted session.
      const currentKey = await connectFreighter()
      if (currentKey !== persisted.publicKey) return null

      const network = await getFreighterNetwork()
      return {
        isConnected: true,
        publicKey: currentKey,
        walletType: persisted.walletType,
        network,
      }
    } else if (persisted.walletType === 'albedo') {
      if (!isAlbedoAvailable()) return null
      return {
        isConnected: true,
        publicKey: persisted.publicKey,
        walletType: persisted.walletType,
        network: persisted.network,
      }
    }
    return null
  } catch {
    // Session expired, wallet disconnected, or the wallet rejected the validation request.
    return null
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface WalletProviderProps {
  children: ReactNode
}

function buildInitialWalletState(): WalletState {
  // Don't auto-set connected state here - let auto-reconnect logic handle it
  // This ensures we validate the session first
  return INITIAL_WALLET_STATE
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [walletState, setWalletState] = useState<WalletState>(buildInitialWalletState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectError, setReconnectError] = useState<string | null>(null)
  const [freighterInstalled, setFreighterInstalled] = useState(false)
  const albedoAvailable = isAlbedoAvailable()

  // Check Freighter availability asynchronously
  useEffect(() => {
    isFreighterInstalled()
      .then(setFreighterInstalled)
      .catch(() => setFreighterInstalled(false))
  }, [])

  // Auto-reconnect on mount if user was previously connected
  useEffect(() => {
    const autoReconnect = async () => {
      const persisted = loadPersistedWallet()
      if (!persisted) return

      log.info('Attempting wallet auto-reconnect', { walletType: persisted.walletType })
      setIsReconnecting(true)
      setReconnectError(null)

      try {
        // Validate that the persisted session is still active
        const restored = await validateWalletSession(persisted)
        if (!restored) {
          setReconnectError('Previous wallet session expired. Please reconnect.')
          clearPersistedWallet()
          setIsReconnecting(false)
          return
        }

        // Session is valid, restore the wallet state and keep storage in sync.
        setWalletState(restored)
        persistWallet({
          publicKey: restored.publicKey ?? persisted.publicKey,
          walletType: restored.walletType,
          network: restored.network ?? persisted.network,
        })
        
        log.info('Wallet auto-reconnect successful', { 
          walletType: persisted.walletType,
          network: persisted.network 
        })
        
        addMonitoringBreadcrumb('Wallet auto-reconnected', 'wallet', {
          walletType: persisted.walletType,
          network: persisted.network,
        })
        
        trackEvent('scan_started', {
          action: 'wallet_auto_reconnect',
          walletType: persisted.walletType,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to restore wallet connection'
        log.error('Wallet auto-reconnect failed', err instanceof Error ? err : new Error(message))
        setReconnectError(message)
        clearPersistedWallet()
      } finally {
        setIsReconnecting(false)
      }
    }

    autoReconnect()
  }, [])

  const connect = useCallback(async (type: WalletType) => {
    log.info('Wallet connection initiated', { walletType: type })
    setIsLoading(true)
    setError(null)
    
    addMonitoringBreadcrumb('Wallet connection started', 'wallet', { walletType: type })
    
    try {
      let publicKey: string
      let network: StellarNetwork

      if (type === 'freighter') {
        const installed = await isFreighterInstalled()
        if (!installed) {
          throw new Error(
            'Freighter is not installed. Visit https://www.freighter.app to install it.'
          )
        }
        publicKey = await connectFreighter()
        network = await getFreighterNetwork()
      } else if (type === 'albedo') {
        if (!isAlbedoAvailable()) {
          throw new Error('Albedo is not available in this environment.')
        }
        publicKey = await connectAlbedo()
        network = 'testnet'
      } else {
        throw new Error(`Wallet type "${type}" is not supported.`)
      }

      const newState: WalletState = { isConnected: true, publicKey, walletType: type, network }
      setWalletState(newState)
      persistWallet({ publicKey, walletType: type, network })
      
      log.info('Wallet connected successfully', { walletType: type, network })
      
      // Set user context in monitoring
      setMonitoringUser(publicKey, undefined, `${type}-user`)
      
      addMonitoringBreadcrumb('Wallet connected', 'wallet', {
        walletType: type,
        network,
      })
      
      trackEvent('scan_started', {
        action: 'wallet_connect',
        walletType: type,
        network,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      log.error('Wallet connection failed', err instanceof Error ? err : new Error(message), { walletType: type })
      setError(message)
      
      trackEvent('error_reported', {
        action: 'wallet_connect_failed',
        walletType: type,
        error: message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    log.info('Wallet disconnected', { walletType: walletState.walletType })
    
    setWalletState(INITIAL_WALLET_STATE)
    setError(null)
    clearPersistedWallet()
    
    // Clear user context in monitoring
    clearMonitoringUser()
    
    addMonitoringBreadcrumb('Wallet disconnected', 'wallet')
    
    trackEvent('scan_completed', {
      action: 'wallet_disconnect',
    })
  }, [walletState.walletType])

  const switchWallet = useCallback(
    async (type: WalletType) => {
      if (walletState.isConnected) {
        clearPersistedWallet()
        setWalletState(INITIAL_WALLET_STATE)
      }
      await connect(type)
    },
    [walletState.isConnected, connect]
  )

  const signTransaction = useCallback(
    async (xdr: XDR): Promise<XDR | null> => {
      if (!walletState.isConnected || !walletState.network || !walletState.walletType) {
        setError('Wallet is not connected')
        log.warn('Transaction signing attempted without connected wallet')
        return null
      }
      
      log.info('Transaction signing initiated', { walletType: walletState.walletType })
      setIsLoading(true)
      setError(null)
      
      addMonitoringBreadcrumb('Transaction signing started', 'transaction', {
        walletType: walletState.walletType,
      })
      
      try {
        let signedXdr: XDR | null = null
        
        if (walletState.walletType === 'freighter') {
          const passphraseMap: Record<StellarNetwork, string> = {
            testnet: 'Test SDF Network ; September 2015',
            futurenet: 'Test SDF Future Network ; October 2022',
            mainnet: 'Public Global Stellar Network ; September 2015',
          }
          signedXdr = await signTransactionWithFreighter(
            xdr,
            passphraseMap[walletState.network],
            walletState.publicKey ?? undefined
          )
        } else if (walletState.walletType === 'albedo') {
          signedXdr = await signTransactionWithAlbedo(xdr, walletState.network)
        } else {
          throw new Error(`Signing not supported for wallet type "${walletState.walletType}"`)
        }
        
        log.info('Transaction signed successfully', { walletType: walletState.walletType })
        
        addMonitoringBreadcrumb('Transaction signed', 'transaction', {
          walletType: walletState.walletType,
        })
        
        trackEvent('upgrade_confirmed', {
          walletType: walletState.walletType,
        })
        
        return signedXdr
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sign transaction'
        log.error('Transaction signing failed', err instanceof Error ? err : new Error(message), {
          walletType: walletState.walletType,
        })
        setError(message)
        
        trackEvent('upgrade_failed', {
          walletType: walletState.walletType,
          error: message,
        })
        
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [walletState]
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<WalletContextValue>(
    () => ({
      walletState,
      isLoading,
      error,
      isReconnecting,
      reconnectError,
      isFreighterInstalled: freighterInstalled,
      isAlbedoAvailable: albedoAvailable,
      connect,
      disconnect,
      switchWallet,
      signTransaction,
      clearError,
    }),
    [
      walletState,
      isLoading,
      error,
      isReconnecting,
      reconnectError,
      freighterInstalled,
      albedoAvailable,
      connect,
      disconnect,
      switchWallet,
      signTransaction,
      clearError,
    ]
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet must be used inside <WalletProvider>')
  }
  return ctx
}
