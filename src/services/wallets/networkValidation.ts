import type { StellarNetwork } from '@/types'
import { getActiveStellarConfig } from '@/config/stellar'
import { createScopedLogger } from '@/services/logging'

const log = createScopedLogger('NetworkValidation')

export interface NetworkMismatch {
  walletNetwork: StellarNetwork
  appNetwork: StellarNetwork
  walletPassphrase?: string
  appPassphrase: string
}

/**
 * Validates that the wallet's network matches the app's configured network.
 * @returns null if networks match, or NetworkMismatch details if they don't
 */
export function validateNetworkMatch(
  walletNetwork: StellarNetwork,
  appConfig = getActiveStellarConfig()
): NetworkMismatch | null {
  if (walletNetwork === appConfig.network) {
    return null
  }

  const mismatch: NetworkMismatch = {
    walletNetwork,
    appNetwork: appConfig.network,
    appPassphrase: appConfig.networkPassphrase,
  }

  log.warn('Network mismatch detected', {
    wallet: walletNetwork,
    app: appConfig.network,
  })

  return mismatch
}

/**
 * Get a user-friendly message explaining the network mismatch.
 */
export function getNetworkMismatchMessage(mismatch: NetworkMismatch): string {
  const appNetworkLabel = mismatch.appNetwork.charAt(0).toUpperCase() + mismatch.appNetwork.slice(1)
  const walletNetworkLabel =
    mismatch.walletNetwork.charAt(0).toUpperCase() + mismatch.walletNetwork.slice(1)

  return `Your wallet is connected to ${walletNetworkLabel}, but this app requires ${appNetworkLabel}. Please switch your wallet to ${appNetworkLabel} to continue.`
}

/**
 * Check if the wallet supports network switching.
 * (Currently Freighter supports switching, Albedo does not)
 */
export function supportsNetworkSwitching(walletType: 'freighter' | 'albedo' | null): boolean {
  return walletType === 'freighter'
}
