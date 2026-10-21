import type { StellarNetwork } from '@/types'

/** Environment variable that must hold the WalletConnect Cloud project ID. */
export const WALLETCONNECT_PROJECT_ID_ENV = 'VITE_WALLETCONNECT_PROJECT_ID'

/** WalletConnect pairing session persisted between page loads. */
export const WALLETCONNECT_STORAGE_KEY = 'stellar-nebula:walletconnect'

/** Stellar methods exposed to mobile wallets. */
export const WALLETCONNECT_STELLAR_METHODS = [
  'stellar_signAndSubmitXDR',
  'stellar_signXDR',
  'stellar_getPublicKey',
] as const

/**
 * CAIP-2 chain identifiers. WalletConnect uses `pubnet` for Stellar mainnet,
 * not `mainnet`; futurenet is not part of the WalletConnect ecosystem, so it
 * pairs against testnet.
 */
const WALLETCONNECT_CHAINS: Record<StellarNetwork, string> = {
  mainnet: 'stellar:pubnet',
  testnet: 'stellar:testnet',
  futurenet: 'stellar:testnet',
}

/** CAIP-2 chain id for a Stellar network. */
export function getWalletConnectChainId(network: StellarNetwork): string {
  return WALLETCONNECT_CHAINS[network] ?? WALLETCONNECT_CHAINS.testnet
}

/** Chain ids supported by this app (used by wallets when approving a session). */
export function getSupportedWalletConnectChains(): string[] {
  return [...new Set(Object.values(WALLETCONNECT_CHAINS))]
}

/** WalletConnect Cloud project ID, trimmed; empty when unset. */
export function getWalletConnectProjectId(): string {
  const value = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
  return typeof value === 'string' ? value.trim() : ''
}

/** Whether the app has enough configuration to open a WalletConnect session. */
export function isWalletConnectConfigured(): boolean {
  return getWalletConnectProjectId().length > 0
}

export type WalletConnectNamespaces = {
  stellar: {
    methods: string[]
    chains: string[]
    events: string[]
  }
}

/** Required namespaces for the session proposal sent to a mobile wallet. */
export function buildWalletConnectNamespaces(network: StellarNetwork): WalletConnectNamespaces {
  return {
    stellar: {
      methods: [...WALLETCONNECT_STELLAR_METHODS],
      chains: [getWalletConnectChainId(network)],
      events: [],
    },
  }
}

export interface WalletConnectMetadata {
  name: string
  description: string
  url: string
  icons: string[]
}

/** App metadata shown in the mobile wallet's approval sheet. */
export function getWalletConnectMetadata(): WalletConnectMetadata {
  const origin =
    typeof window === 'undefined' ? 'https://stellar-nebula.app' : window.location.origin

  return {
    name: 'Nebula Nomad',
    description: 'Space Exploration on Stellar',
    url: origin,
    icons: [`${origin}/icon-192.png`],
  }
}
