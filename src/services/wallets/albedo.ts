import type { PublicKey, XDR, StellarNetwork } from '@/types'

/**
 * The subset of the Albedo intent API that this app uses. The real
 * `@albedo-link/intent` module exposes these as named exports, but its
 * published types are incomplete, so we describe the surface explicitly.
 */
export interface AlbedoIntentApi {
  publicKey: () => Promise<{ pubkey: string; intent: string; signature: string }>
  tx: (options: { xdr: string; network_passphrase: string; network?: string }) => Promise<{
    signed_envelope_xdr: string
    intent: string
    xdr: string
    pubkey: string
    network?: string
  }>
  info: () => Promise<{ network?: string; supported_intents?: string[] }>
}

async function loadAlbedo(): Promise<AlbedoIntentApi> {
  return (await import('@albedo-link/intent')) as unknown as AlbedoIntentApi
}

/**
 * Albedo is a web popup wallet, so it is available in any browser context
 * that can open popups and render iframes.
 */
export function isAlbedoAvailable(): boolean {
  return typeof window !== 'undefined'
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

  const network =
    networkPassphrase === 'mainnet' || networkPassphrase.includes('Public Global')
      ? undefined
      : networkPassphrase

  const result = await albedo.tx({ xdr, network_passphrase: networkPassphrase, network })

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
    const info = await albedo.info()
    const networkMap: Record<string, StellarNetwork> = {
      testnet: 'testnet',
      pubnet: 'mainnet',
      public: 'mainnet',
      futurenet: 'futurenet',
    }
    return networkMap[info.network?.toLowerCase() ?? ''] ?? 'testnet'
  } catch {
    return 'testnet'
  }
}
