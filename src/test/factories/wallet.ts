import { faker } from '@faker-js/faker'
import type { WalletState, WalletType, StellarNetwork } from '@/types/stellar'

const WALLET_TYPES: WalletType[] = ['freighter', 'albedo', 'xbull', 'manual']
const NETWORKS: StellarNetwork[] = ['testnet', 'mainnet', 'futurenet']

export interface WalletStateOverrides {
  isConnected?: boolean
  publicKey?: string | null
  walletType?: WalletType | null
  network?: StellarNetwork | null
}

export function buildWalletState(overrides: WalletStateOverrides = {}): WalletState {
  const isConnected = overrides.isConnected ?? faker.datatype.boolean()
  
  return {
    isConnected,
    publicKey: overrides.publicKey !== undefined ? overrides.publicKey : (isConnected ? faker.string.alphanumeric(56) : null),
    walletType: overrides.walletType !== undefined ? overrides.walletType : (isConnected ? faker.helpers.arrayElement(WALLET_TYPES) : null),
    network: overrides.network !== undefined ? overrides.network : (isConnected ? faker.helpers.arrayElement(NETWORKS) : null),
  }
}
