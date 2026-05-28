import type { StellarNetwork } from '@/types'

export interface NetworkContractConfig {
  nebulaContractId: string
  tokenContractId: string
}

export interface NetworkConfigMap {
  testnet: NetworkContractConfig
  futurenet: NetworkContractConfig
  mainnet: NetworkContractConfig
}

/**
 * Network-specific contract configurations.
 * Update these with your actual deployed contract IDs for each network.
 */
export const NETWORK_CONTRACTS: NetworkConfigMap = {
  testnet: {
    nebulaContractId: import.meta.env.VITE_TESTNET_NEBULA_CONTRACT_ID || import.meta.env.VITE_NEBULA_CONTRACT_ID || 'C_TESTNET_PLACEHOLDER',
    tokenContractId: import.meta.env.VITE_TESTNET_TOKEN_CONTRACT_ID || import.meta.env.VITE_TOKEN_CONTRACT_ID || 'C_TESTNET_PLACEHOLDER',
  },
  futurenet: {
    nebulaContractId: import.meta.env.VITE_FUTURENET_NEBULA_CONTRACT_ID || import.meta.env.VITE_NEBULA_CONTRACT_ID || 'C_FUTURENET_PLACEHOLDER',
    tokenContractId: import.meta.env.VITE_FUTURENET_TOKEN_CONTRACT_ID || import.meta.env.VITE_TOKEN_CONTRACT_ID || 'C_FUTURENET_PLACEHOLDER',
  },
  mainnet: {
    nebulaContractId: import.meta.env.VITE_MAINNET_NEBULA_CONTRACT_ID || 'C_MAINNET_PLACEHOLDER',
    tokenContractId: import.meta.env.VITE_MAINNET_TOKEN_CONTRACT_ID || 'C_MAINNET_PLACEHOLDER',
  },
}

/**
 * Get contract IDs for the specified network.
 */
export function getNetworkContracts(network: StellarNetwork): NetworkContractConfig {
  return NETWORK_CONTRACTS[network]
}

/**
 * Get the Nebula contract ID for the specified network.
 */
export function getNebulaContractId(network: StellarNetwork): string {
  return getNetworkContracts(network).nebulaContractId
}

/**
 * Get the Token contract ID for the specified network.
 */
export function getTokenContractId(network: StellarNetwork): string {
  return getNetworkContracts(network).tokenContractId
}
