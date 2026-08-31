/* eslint-disable */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  connectFreighter,
  connectAlbedo,
  getFreighterNetwork,
  getAlbedoNetwork,
  isFreighterInstalled,
  isAlbedoAvailable,
  signTransactionWithFreighter,
  signTransactionWithAlbedo,
  isWalletConnectAvailable,
  connectWalletConnect,
  signTransactionWithWalletConnect,
  getWalletConnectNetwork,
  disconnectWalletConnect,
  loadWalletConnectSession,
  validateNetworkMatch,
  getNetworkMismatchMessage,
  handleWalletConnectionError,
  formatWalletError,
} from '@services/wallets'
import type { WalletState, WalletType, XDR, StellarNetwork } from '@/types'
import { createScopedLogger } from '@/services/logging'
import { getActiveStellarConfig } from '@/config/stellar'
import {
  addMonitoringBreadcrumb,
  setMonitoringUser,
  clearMonitoringUser,
} from '@/services/monitoring'
import { trackEvent } from '@/services/analytics'
import { purgeApplicationState } from '@/utils/stateCleanup'
import { setSessionPassphrase, saveEncryptedCopy } from '@/utils/storage'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { SessionTimeoutWarning } from '@/components/Wallet/SessionTimeoutWarning'

const log = createScopedLogger('WalletContext')

// ─── Storage key ─────────────────────────────────────────────────────────────

const WALLET_STORAGE_KEY = 'stellar-nebula:wallet'

interface PersistedWallet {
  publicKey: string
  walletType: WalletType
  network: StellarNetwork
  walletConnectSession?: unknown
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
  isWalletConnectAvailable: boolean
  networkMismatchWarning: string | null
  connect: (type: WalletType) => Promise<void>
  disconnect: () => void
  switchWallet: (type: WalletType) => Promise<void>
  signTransaction: (xdr: XDR) => Promise<XDR | null>
  clearError: () => void
  clearNetworkWarning: () => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const WalletContext = createContext<WalletContextValue | null>(null)

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
    // Also save an encrypted copy for the live session when available.
    void saveEncryptedCopy('stellar-nebula:enc:', 'wallet', wallet)
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
    } else if (persisted.walletType === 'walletconnect') {
      if (!isWalletConnectAvailable()) return null
      const session = loadWalletConnectSession()
      if (!session) return null
      return {
        isConnected: true,
        publicKey: persisted.publicKey,
        walletType: persisted.walletType,
        network: persisted.network,
      }
    }
    return null
  } catch {
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
  const [networkMismatchWarning, setNetworkMismatchWarning] = useState<string | null>(null)
  const albedoAvailable = isAlbedoAvailable()
  const walletConnectAvailable = isWalletConnectAvailable()
  const appConfig = getActiveStellarConfig()

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
          walletType: restored.walletType ?? persisted.walletType,
          network: restored.network ?? persisted.network,
        })

        log.info('Wallet auto-reconnect successful', {
          walletType: persisted.walletType,
          network: persisted.network,
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

  const connect = useCallback(
    async (type: WalletType) => {
      log.info('Wallet connection initiated', { walletType: type })
      setIsLoading(true)
      setError(null)
      setNetworkMismatchWarning(null)

      addMonitoringBreadcrumb('Wallet connection started', 'wallet', { walletType: type })

      try {
        let publicKey: string
        let network: StellarNetwork

        if (type === 'freighter') {
          const installed = await isFreighterInstalled()
          if (!installed) {
            const walletError = handleWalletConnectionError(
              new Error('Freighter is not installed'),
              type
            )
            throw new Error(formatWalletError(walletError))
          }
          publicKey = await connectFreighter()
          network = await getFreighterNetwork()
        } else if (type === 'albedo') {
          if (!isAlbedoAvailable()) {
            const walletError = handleWalletConnectionError(
              new Error('Albedo is not available'),
              type
            )
            throw new Error(formatWalletError(walletError))
          }
          publicKey = await connectAlbedo()
          network = await getAlbedoNetwork()
        } else if (type === 'walletconnect') {
          if (!isWalletConnectAvailable()) {
            const walletError = handleWalletConnectionError(
              new Error('WalletConnect is not available'),
              type
            )
            throw new Error(formatWalletError(walletError))
          }
          const wcNetwork = appConfig.network as StellarNetwork
          const result = await connectWalletConnect(wcNetwork)
          publicKey = result.publicKey
          network = wcNetwork
        } else {
          throw new Error(`Wallet type "${type}" is not supported.`)
        }

        // Check for network mismatch
        const mismatch = validateNetworkMatch(network, appConfig)
        if (mismatch) {
          const warningMessage = getNetworkMismatchMessage(mismatch)
          setNetworkMismatchWarning(warningMessage)
          log.warn('Network mismatch detected after wallet connection', {
            walletNetwork: mismatch.walletNetwork,
            appNetwork: mismatch.appNetwork,
          })
          addMonitoringBreadcrumb('Network mismatch warning shown', 'wallet', {
            walletNetwork: mismatch.walletNetwork,
            appNetwork: mismatch.appNetwork,
          })
        }

        const newState: WalletState = { isConnected: true, publicKey, walletType: type, network }
        setWalletState(newState)
        persistWallet({
          publicKey,
          walletType: type,
          network,
          walletConnectSession: type === 'walletconnect' ? loadWalletConnectSession() : undefined,
        })

        // Derive a per-session passphrase (in-memory only) and enable encrypted copies
        try {
          const rand = crypto.getRandomValues(new Uint8Array(32))
          const pass = Array.from(rand).map((b) => b.toString(16).padStart(2, '0')).join('')
          setSessionPassphrase(pass)
          // Save encrypted backup (best-effort)
          void saveEncryptedCopy('stellar-nebula:enc:', 'wallet', {
            publicKey,
            walletType: type,
            network,
          })
        } catch {
          // ignore session encryption failures
        }

        setMonitoringUser(publicKey, undefined, `${type}-user`)

        log.info('Wallet connected successfully', { walletType: type, network })

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
        const walletError = handleWalletConnectionError(err, type)
        const message = formatWalletError(walletError)
        log.error('Wallet connection failed', err instanceof Error ? err : new Error(String(err)), {
          walletType: type,
          errorCode: walletError.code,
        })
        setError(message)

        trackEvent('error_reported', {
          action: 'wallet_connect_failed',
          walletType: type,
          error: message,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [appConfig]
  )

  const disconnect = useCallback(() => {
    log.info('Wallet disconnected', { walletType: walletState.walletType })

    if (walletState.walletType === 'walletconnect') {
      disconnectWalletConnect()
    }

    setWalletState(INITIAL_WALLET_STATE)
    setError(null)
    clearPersistedWallet()

    // Comprehensive purge of state, stores, and cached session storage
    purgeApplicationState()

    clearMonitoringUser()
    addMonitoringBreadcrumb('Wallet disconnected', 'wallet')

    // Clear any in-memory session encryption key
    try {
      setSessionPassphrase(null)
    } catch {
      // ignore
    }

    trackEvent('scan_completed', {
      action: 'wallet_disconnect',
    })
  }, [walletState.walletType])

  const { isWarningOpen, remainingWarningSeconds, extendSession } = useSessionTimeout({
    enabled: walletState.isConnected,
    onTimeout: disconnect,
  })

  const switchWallet = useCallback(
    async (type: WalletType) => {
      disconnect()
      await connect(type)
    },
    [connect, disconnect]
  )

  const signTransaction = useCallback(
    async (xdr: XDR): Promise<XDR | null> => {
      if (
        !walletState.isConnected ||
        !walletState.publicKey ||
        !walletState.walletType ||
        !walletState.network
      ) {
        const message = 'No wallet connected. Please connect a wallet to sign transactions.'
        setError(message)
        log.warn('Transaction signing attempted with no wallet connected')
        return null
      }

      // Pre-signing network validation
      const mismatch = validateNetworkMatch(walletState.network, appConfig)
      if (mismatch) {
        const warningMessage = getNetworkMismatchMessage(mismatch)
        setError(warningMessage)
        log.warn('Transaction signing blocked due to network mismatch', {
          walletNetwork: mismatch.walletNetwork,
          appNetwork: mismatch.appNetwork,
        })
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
        } else if (walletState.walletType === 'walletconnect') {
          const wcSession = loadWalletConnectSession()
          if (!wcSession) {
            throw new Error('WalletConnect session not found. Please reconnect.')
          }
          signedXdr = await signTransactionWithWalletConnect(xdr, walletState.network, wcSession)
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
    [walletState, appConfig]
  )

  const clearError = useCallback(() => setError(null), [])

  const clearNetworkWarning = useCallback(() => setNetworkMismatchWarning(null), [])

  const value = useMemo<WalletContextValue>(
    () => ({
      walletState,
      isLoading,
      error,
      isReconnecting,
      reconnectError,
      isFreighterInstalled: freighterInstalled,
      isAlbedoAvailable: albedoAvailable,
      isWalletConnectAvailable: walletConnectAvailable,
      networkMismatchWarning,
      connect,
      disconnect,
      switchWallet,
      signTransaction,
      clearError,
      clearNetworkWarning,
    }),
    [
      walletState,
      isLoading,
      error,
      isReconnecting,
      reconnectError,
      freighterInstalled,
      albedoAvailable,
      walletConnectAvailable,
      networkMismatchWarning,
      connect,
      disconnect,
      switchWallet,
      signTransaction,
      clearError,
      clearNetworkWarning,
    ]
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      <SessionTimeoutWarning
        isOpen={isWarningOpen}
        remainingSeconds={remainingWarningSeconds}
        onExtend={extendSession}
        onDisconnect={disconnect}
      />
    </WalletContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet must be used inside <WalletProvider>')
  }
  return ctx
}
