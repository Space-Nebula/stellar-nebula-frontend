import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type GraphicsQuality = 'low' | 'medium' | 'high'
export type StellarNetwork = 'futurenet' | 'testnet' | 'mainnet'

export interface SettingsState {
  graphicsQuality: GraphicsQuality
  soundEnabled: boolean
  notificationsEnabled: boolean
  analyticsEnabled: boolean
  network: StellarNetwork
}

export interface SettingsActions {
  setGraphicsQuality: (quality: GraphicsQuality) => void
  setSoundEnabled: (enabled: boolean) => void
  setNotificationsEnabled: (enabled: boolean) => void
  setAnalyticsEnabled: (enabled: boolean) => void
  setNetwork: (network: StellarNetwork) => void
}

export type SettingsStore = SettingsState & SettingsActions

export const settingsStoreKey = 'stellar-nebula:settings-store'

export const initialSettingsState: SettingsState = {
  graphicsQuality: 'high',
  soundEnabled: true,
  notificationsEnabled: true,
  analyticsEnabled: true,
  network: 'futurenet',
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialSettingsState,
      setGraphicsQuality: (graphicsQuality) => set({ graphicsQuality }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
      setNetwork: (network) => set({ network }),
    }),
    {
      name: settingsStoreKey,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
