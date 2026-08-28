import type { PublicKey, XDR, StellarNetwork } from '@/types'

interface AlbedoClient {
  publicKey: () => Promise<{ pubkey?: string }>
  tx: (options: {
    xdr: string
    network?: 'testnet' | 'futurenet'
    network_passphrase?: string
  }) => Promise<{ signed_envelope_xdr?: string }>
  info?: () => Promise<{ network?: string }>
}

async function loadAlbedo(): Promise<AlbedoClient> {
  const module = (await import('@albedo-link/intent')) as unknown as {
    default?: AlbedoClient
  } & AlbedoClient
  return module.default ?? module
}

export function isAlbedoAvailable(): boolean {
  return typeof window !== 'undefined'
}

function getAlbedoNetworkParam(networkPassphrase: string): 'testnet' | 'futurenet' | undefined {
  const normalized = networkPassphrase.toLowerCase()
  if (normalized.includes('futurenet')) return 'futurenet'
  if (normalized.includes('test') || normalized === 'testnet') return 'testnet'
  return undefined
}

/**
 * Connect to the Albedo wallet via its web popup intent.
 *
 * @returns The user's Stellar public key.
 */
export async function connectAlbedo(): Promise<PublicKey> {
  const albedo = await loadAlbedo()
  const result = await albedo.publicKey()
  if (!result.pubkey) {
    throw new Error('Albedo did not return a public key')
  }
  return result.pubkey
}

/**
 * Sign a transaction XDR with Albedo.
 */
export async function signTransactionWithAlbedo(xdr: XDR, networkPassphrase: string): Promise<XDR> {
  const albedo = await loadAlbedo()
  const result = await albedo.tx({
    xdr,
    network: getAlbedoNetworkParam(networkPassphrase),
    network_passphrase: networkPassphrase,
  })
  if (!result.signed_envelope_xdr) {
    throw new Error('Albedo did not return a signed transaction')
  }
  return result.signed_envelope_xdr
}

/**
 * Get the network that Albedo is currently using.
 */
export async function getAlbedoNetwork(): Promise<StellarNetwork> {
  try {
    const albedo = await loadAlbedo()
    const info = await albedo.info?.()
    const networkMap: Record<string, StellarNetwork> = {
      testnet: 'testnet',
      pubnet: 'mainnet',
      futurenet: 'futurenet',
    }
    return networkMap[info?.network?.toLowerCase() ?? ''] ?? 'testnet'
  } catch {
    return 'testnet'
  }
}
