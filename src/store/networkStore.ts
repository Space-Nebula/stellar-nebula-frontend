import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StellarNetwork } from '@/types'

export interface NetworkState {
  network: StellarNetwork
  setNetwork: (network: StellarNetwork) => void
}

export type NetworkStore = NetworkState

export const networkStoreStorageKey = 'stellar-nebula:network'

export const initialNetworkState: NetworkState = {
  network: 'futurenet',
  setNetwork: () => {},
}

export const useNetworkStore = create<NetworkStore>()(
  persist(
    (set) => ({
      network: 'futurenet',
      setNetwork: (network: StellarNetwork) => set({ network }),
    }),
    {
      name: networkStoreStorageKey,
      partialize: (state) => ({ network: state.network }),
    }
  )
)
