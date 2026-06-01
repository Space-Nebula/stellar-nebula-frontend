import type { PublicKey, XDR, StellarNetwork } from '@/types'

/**
 * Connect to the Albedo wallet via its web popup intent.
 *
 * @returns The user's Stellar public key.
 */
export async function connectAlbedo(): Promise<PublicKey> {
  const albedo = await import('@albedo-link/intent')
  const result = await albedo.publicKey()
  return result.pubkey
}

/**
 * Sign a transaction XDR with Albedo.
 */
export async function signTransactionWithAlbedo(xdr: XDR, networkPassphrase: string): Promise<XDR> {
  const albedo = await import('@albedo-link/intent')
  const result = await albedo.tx({ xdr, network_passphrase: networkPassphrase })
  return result.signed_envelope_xdr
}

/**
 * Get the network that Albedo is currently using.
 */
export async function getAlbedoNetwork(): Promise<StellarNetwork> {
  try {
    const albedo = await import('@albedo-link/intent')
    const info = await albedo.info()
    const networkMap: Record<string, StellarNetwork> = {
      testnet: 'testnet',
      pubnet: 'mainnet',
      futurenet: 'futurenet',
    }
    return networkMap[info.network?.toLowerCase()] ?? 'testnet'
  } catch {
    return 'testnet'
  }
}
