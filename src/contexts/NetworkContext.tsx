import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { StellarNetwork } from '@/types'
import { useNetworkStore } from '@/store'

// ─── Context shape ────────────────────────────────────────────────────────────

export interface NetworkContextValue {
  currentNetwork: StellarNetwork
  switchNetwork: (network: StellarNetwork, confirmed?: boolean) => Promise<void>
  networkSwitchPending: boolean
  pendingNetwork: StellarNetwork | null
  confirmNetworkSwitch: () => Promise<void>
  cancelNetworkSwitch: () => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const NetworkContext = createContext<NetworkContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

interface NetworkProviderProps {
  children: ReactNode
  onNetworkChange?: (network: StellarNetwork) => void | Promise<void>
}

export function NetworkProvider({ children, onNetworkChange }: NetworkProviderProps) {
  const { network, setNetwork } = useNetworkStore()
  const [networkSwitchPending, setNetworkSwitchPending] = useState(false)
  const [pendingNetwork, setPendingNetwork] = useState<StellarNetwork | null>(null)

  const switchNetwork = useCallback(
    async (newNetwork: StellarNetwork, confirmed = false) => {
      if (newNetwork === network) return

      if (!confirmed) {
        setPendingNetwork(newNetwork)
        setNetworkSwitchPending(true)
        return
      }

      try {
        // Call optional callback to handle wallet reconnection or other side effects
        if (onNetworkChange) {
          await onNetworkChange(newNetwork)
        }

        // Update the network
        setNetwork(newNetwork)
        setPendingNetwork(null)
        setNetworkSwitchPending(false)
      } catch (err) {
        setPendingNetwork(null)
        setNetworkSwitchPending(false)
        throw err
      }
    },
    [network, setNetwork, onNetworkChange]
  )

  const confirmNetworkSwitch = useCallback(async () => {
    if (!pendingNetwork) return

    await switchNetwork(pendingNetwork, true)
  }, [pendingNetwork, switchNetwork])

  const cancelNetworkSwitch = useCallback(() => {
    setPendingNetwork(null)
    setNetworkSwitchPending(false)
  }, [])

  const value: NetworkContextValue = useMemo(
    () => ({
      currentNetwork: network,
      switchNetwork,
      networkSwitchPending,
      pendingNetwork,
      confirmNetworkSwitch,
      cancelNetworkSwitch,
    }),
    [network, switchNetwork, networkSwitchPending, pendingNetwork, confirmNetworkSwitch, cancelNetworkSwitch]
  )

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider')
  }
  return context
}
