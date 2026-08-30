import { Horizon, Networks, rpc } from '@stellar/stellar-sdk'

export type StellarNetwork = 'testnet' | 'futurenet' | 'mainnet'

export interface StellarEnvConfig {
  STELLAR_NETWORK?: StellarNetwork
  STELLAR_RPC_URL?: string
  STELLAR_HORIZON_URL?: string
  STELLAR_PASSPHRASE?: string
  NEBULA_CONTRACT_ID?: string
  TOKEN_CONTRACT_ID?: string
}

export interface StellarNetworkConfig {
  network: StellarNetwork
  rpcUrl: string
  horizonUrl: string
  networkPassphrase: string
  nebulaContractId: string
  tokenContractId: string
}

export interface StellarConnectionClients {
  rpcServer: Pick<rpc.Server, 'getHealth' | 'getNetwork'>
  horizonServer: Pick<Horizon.Server, 'root'>
}

export interface StellarConnectionStatus {
  network: StellarNetwork
  rpcHealthy: boolean
  rpcStatus: string
  horizonConnected: boolean
  networkPassphrase: string
}

/**
 * Environment variables that select the Soroban contract addresses for a
 * specific network. Preferred over the generic contract-ID variables so each
 * network (testnet / futurenet / mainnet) can target its own deployment.
 */
const CONTRACT_ID_ENV_KEYS: Record<
  StellarNetwork,
  { nebula: string; token: string }
> = {
  testnet: {
    nebula: 'VITE_NEBULA_CONTRACT_ID_TESTNET',
    token: 'VITE_TOKEN_CONTRACT_ID_TESTNET',
  },
  futurenet: {
    nebula: 'VITE_NEBULA_CONTRACT_ID_FUTURENET',
    token: 'VITE_TOKEN_CONTRACT_ID_FUTURENET',
  },
  mainnet: {
    nebula: 'VITE_NEBULA_CONTRACT_ID_MAINNET',
    token: 'VITE_TOKEN_CONTRACT_ID_MAINNET',
  },
}

function readContractId(network: StellarNetwork, kind: 'nebula' | 'token'): string {
  const keys = CONTRACT_ID_ENV_KEYS[network][kind]
  const networkSpecific = import.meta.env[keys]
  if (typeof networkSpecific === 'string' && networkSpecific.length > 0) {
    return networkSpecific
  }

  const generic = import.meta.env[kind === 'nebula' ? 'VITE_NEBULA_CONTRACT_ID' : 'VITE_TOKEN_CONTRACT_ID']
  return typeof generic === 'string' ? generic : ''
}

/** Preconfigured Stellar network definitions. */
export const STELLAR_NETWORK_CONFIGS: Record<StellarNetwork, StellarNetworkConfig> = {
  testnet: {
    network: 'testnet',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET,
    nebulaContractId: readContractId('testnet', 'nebula'),
    tokenContractId: readContractId('testnet', 'token'),
  },
  futurenet: {
    network: 'futurenet',
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    networkPassphrase: Networks.FUTURENET,
    nebulaContractId: readContractId('futurenet', 'nebula'),
    tokenContractId: readContractId('futurenet', 'token'),
  },
  mainnet: {
    network: 'mainnet',
    rpcUrl: 'https://soroban-rpc.stellar.org',
    horizonUrl: 'https://horizon.stellar.org',
    networkPassphrase: Networks.PUBLIC,
    nebulaContractId: readContractId('mainnet', 'nebula'),
    tokenContractId: readContractId('mainnet', 'token'),
  },
}

/** Get the config for a specific Stellar network. */
export function getStellarNetworkConfig(network: StellarNetwork = 'testnet'): StellarNetworkConfig {
  return STELLAR_NETWORK_CONFIGS[network]
}

/** Read Stellar config values from environment variables. */
export function getStellarEnvConfig(): StellarEnvConfig {
  return {
    STELLAR_NETWORK: import.meta.env.VITE_STELLAR_NETWORK as StellarNetwork | undefined,
    STELLAR_RPC_URL: import.meta.env.VITE_STELLAR_RPC_URL,
    STELLAR_HORIZON_URL: import.meta.env.VITE_STELLAR_HORIZON_URL,
    STELLAR_PASSPHRASE: import.meta.env.VITE_STELLAR_PASSPHRASE,
    NEBULA_CONTRACT_ID:
      import.meta.env.VITE_NEBULA_CONTRACT_ID ||
      (import.meta.env.VITE_NEBULA_CONTRACT_ID_TESTNET as string | undefined),
    TOKEN_CONTRACT_ID:
      import.meta.env.VITE_TOKEN_CONTRACT_ID ||
      (import.meta.env.VITE_TOKEN_CONTRACT_ID_TESTNET as string | undefined),
  }
}

/**
 * Get the active Stellar configuration by merging defaults with
 * environment variable overrides.
 */
export function getActiveStellarConfig(
  config: StellarEnvConfig = getStellarEnvConfig()
): StellarNetworkConfig {
  const network = config.STELLAR_NETWORK ?? 'testnet'
  const baseConfig = getStellarNetworkConfig(network)

  return {
    ...baseConfig,
    rpcUrl: config.STELLAR_RPC_URL || baseConfig.rpcUrl,
    horizonUrl: config.STELLAR_HORIZON_URL || baseConfig.horizonUrl,
    networkPassphrase: config.STELLAR_PASSPHRASE || baseConfig.networkPassphrase,
    nebulaContractId: config.NEBULA_CONTRACT_ID || baseConfig.nebulaContractId,
    tokenContractId: config.TOKEN_CONTRACT_ID || baseConfig.tokenContractId,
  }
}

/** Create a Soroban RPC server client. */
export function createStellarRpcServer(
  config: StellarNetworkConfig = getActiveStellarConfig()
): rpc.Server {
  return new rpc.Server(config.rpcUrl)
}

/** Create a Horizon server client. */
export function createHorizonServer(
  config: StellarNetworkConfig = getActiveStellarConfig()
): Horizon.Server {
  return new Horizon.Server(config.horizonUrl)
}

/**
 * Check connectivity to Stellar network services (RPC + Horizon).
 *
 * @example
 * const status = await checkStellarConnection()
 * console.log(status.rpcHealthy, status.horizonConnected)
 */
export async function checkStellarConnection(
  config: StellarNetworkConfig = getActiveStellarConfig(),
  clients: StellarConnectionClients = {
    rpcServer: createStellarRpcServer(config),
    horizonServer: createHorizonServer(config),
  }
): Promise<StellarConnectionStatus> {
  const [health, networkInfo] = await Promise.all([
    clients.rpcServer.getHealth(),
    clients.rpcServer.getNetwork(),
    clients.horizonServer.root(),
  ])

  return {
    network: config.network,
    rpcHealthy: health.status === 'healthy',
    rpcStatus: health.status,
    horizonConnected: true,
    networkPassphrase: networkInfo.passphrase,
  }
}
