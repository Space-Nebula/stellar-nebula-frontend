import type { PublicKey, StellarNetwork, XDR } from '@/types'

/**
 * The subset of the Albedo intent API that this app uses. The real
 * `@albedo-link/intent` package has shipped both named exports and a default
 * export across versions, so the loader below accepts either shape.
 */
export interface AlbedoIntentApi {
  publicKey: () => Promise<{ pubkey?: string; intent?: string; signature?: string }>
  tx: (options: {
    xdr: string
    network?: 'testnet' | 'futurenet'
    network_passphrase?: string
  }) => Promise<{
    signed_envelope_xdr?: string
    intent?: string
    xdr?: string
    pubkey?: string
    network?: string
  }>
  info?: () => Promise<{ network?: string; supported_intents?: string[] }>
}

/**
 * Albedo rejects intents with a plain `{ code, message }` object rather than an
 * `Error`. Normalise it so error classification and logging see a real message
 * instead of `[object Object]`.
 */
export function toAlbedoError(error: unknown): Error {
  if (error instanceof Error) return error

  if (typeof error === 'object' && error !== null) {
    // The intent transport rejects with `{ error: { code, message } }`, while
    // some versions reject with the inner object directly.
    const nested = (error as { error?: unknown }).error
    if (typeof nested === 'object' && nested !== null) {
      return toAlbedoError(nested)
    }

    const { message, code, ext } = error as { message?: unknown; code?: unknown; ext?: unknown }
    const text =
      typeof message === 'string' && message.length > 0
        ? message
        : typeof ext === 'string' && ext.length > 0
          ? ext
          : 'Albedo request failed'
    const normalized = new Error(text)
    if (typeof code === 'number') {
      ;(normalized as Error & { code?: number }).code = code
    }
    return normalized
  }

  return new Error(String(error))
}

async function loadAlbedo(): Promise<AlbedoIntentApi> {
  const module = (await import('@albedo-link/intent')) as unknown as {
    default?: AlbedoIntentApi
  } & AlbedoIntentApi

  return module.default ?? module
}

/**
 * Albedo is a web popup wallet, so it is available in any browser context
 * that can open popups and render iframes.
 */
export function isAlbedoAvailable(): boolean {
  return typeof window !== 'undefined'
}

export function getAlbedoNetworkParam(
  networkPassphrase: string
): 'testnet' | 'futurenet' | undefined {
  const normalized = networkPassphrase.toLowerCase()

  if (normalized.includes('future')) return 'futurenet'
  if (normalized.includes('test') || normalized === 'testnet') return 'testnet'
  return undefined
}

/**
 * Connect to the Albedo wallet via its web popup intent.
 *
 * @returns The user's Stellar public key.
 */
export async function connectAlbedo(): Promise<PublicKey> {
  try {
    const albedo = await loadAlbedo()
    const result = await albedo.publicKey()

    if (!result.pubkey) {
      throw new Error('Albedo did not return a public key')
    }

    return result.pubkey
  } catch (err) {
    throw toAlbedoError(err)
  }
}

/**
 * Sign a transaction XDR with Albedo.
 */
export async function signTransactionWithAlbedo(xdr: XDR, networkPassphrase: string): Promise<XDR> {
  try {
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
  } catch (err) {
    throw toAlbedoError(err)
  }
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
      public: 'mainnet',
      mainnet: 'mainnet',
      futurenet: 'futurenet',
    }

    return networkMap[info?.network?.toLowerCase() ?? ''] ?? 'testnet'
  } catch {
    return 'testnet'
  }
}
