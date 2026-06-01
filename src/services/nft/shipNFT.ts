import type { StellarNetworkConfig } from '@config/stellar'

export interface ShipNFTAttribute {
  trait_type: string
  value: string | number | boolean
}

export interface ShipNFTMetadata {
  name: string
  description?: string
  image?: string
  model?: string
  tier?: string
  stats?: Record<string, number>
  attributes?: ShipNFTAttribute[]
}

export interface ShipNFTRecord {
  accountId: string
  assetCode: string
  issuer?: string
  metadata: ShipNFTMetadata
  metadataUri?: string
  fetchedAt: string
}

interface AccountRecord {
  balances?: Array<{
    asset_type: string
    balance: string
    asset_code?: string
    asset_issuer?: string
  }>
  data_attr?: Record<string, string>
}

interface CacheEnvelope {
  expiresAt: number
  record: ShipNFTRecord | null
}

const CACHE_TTL_MS = 30_000
const SHIP_DATA_KEYS = ['ship_nft', 'ship_metadata', 'metadata_uri', 'nft_metadata', 'ship_uri']

function getCacheKey(accountId: string): string {
  return `stellar-nebula:ship-nft:${accountId}`
}

function readCache(accountId: string): ShipNFTRecord | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getCacheKey(accountId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as CacheEnvelope
    if (Date.now() > parsed.expiresAt) return null
    return parsed.record
  } catch {
    return null
  }
}

function writeCache(accountId: string, record: ShipNFTRecord | null): void {
  if (typeof window === 'undefined') return

  try {
    const envelope: CacheEnvelope = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      record,
    }
    window.localStorage.setItem(getCacheKey(accountId), JSON.stringify(envelope))
  } catch {
    // Ignore storage failures.
  }
}

function safeDecodeBase64(value: string): string {
  try {
    return typeof atob === 'function' ? atob(value) : Buffer.from(value, 'base64').toString('utf8')
  } catch {
    return value
  }
}

function normalizeMetadataUrl(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.replace('ipfs://', '').replace(/^ipfs\//, '')}`
  }

  return uri
}

function tryParseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function parseMetadata(raw: unknown): ShipNFTMetadata {
  if (!raw || typeof raw !== 'object') {
    return { name: 'Unnamed ship', attributes: [] }
  }

  const source = raw as Record<string, unknown>
  const metadata: ShipNFTMetadata = {
    name: typeof source.name === 'string' ? source.name : 'Unnamed ship',
    description: typeof source.description === 'string' ? source.description : undefined,
    image: typeof source.image === 'string' ? source.image : undefined,
    model: typeof source.model === 'string' ? source.model : undefined,
    tier: typeof source.tier === 'string' ? source.tier : undefined,
    stats:
      source.stats && typeof source.stats === 'object'
        ? Object.fromEntries(
            Object.entries(source.stats as Record<string, unknown>).flatMap(([key, value]) =>
              typeof value === 'number' ? [[key, value]] : []
            )
          )
        : undefined,
    attributes: Array.isArray(source.attributes)
      ? source.attributes.flatMap((attribute) => {
          if (!attribute || typeof attribute !== 'object') return []
          const item = attribute as Record<string, unknown>
          if (typeof item.trait_type !== 'string') return []
          if (
            typeof item.value !== 'string' &&
            typeof item.value !== 'number' &&
            typeof item.value !== 'boolean'
          ) {
            return []
          }
          return [{ trait_type: item.trait_type, value: item.value }]
        })
      : [],
  }

  return metadata
}

function extractMetadataUri(account: AccountRecord): string | undefined {
  if (!account.data_attr) return undefined

  for (const key of SHIP_DATA_KEYS) {
    const encoded = account.data_attr[key]
    if (!encoded) continue

    const decoded = safeDecodeBase64(encoded).trim()
    if (decoded.startsWith('{')) {
      try {
        const parsed = JSON.parse(decoded) as Record<string, unknown>
        const uri =
          typeof parsed.metadataUri === 'string'
            ? parsed.metadataUri
            : typeof parsed.uri === 'string'
              ? parsed.uri
              : typeof parsed.image === 'string'
                ? parsed.image
                : undefined
        if (uri) return uri
      } catch {
        // Fall through and treat the decoded value as the URI.
      }
    }

    if (decoded) return decoded
  }

  return undefined
}

function extractShipAsset(account: AccountRecord): { code: string; issuer?: string } | null {
  const matchingBalance = account.balances?.find(
    (balance) =>
      balance.asset_type !== 'native' &&
      (balance.asset_code?.toLowerCase().includes('ship') ||
        balance.asset_code?.toLowerCase().includes('nft') ||
        balance.asset_code?.toLowerCase().includes('hull'))
  )

  if (!matchingBalance || !matchingBalance.asset_code) return null

  return {
    code: matchingBalance.asset_code,
    issuer: matchingBalance.asset_issuer,
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ship metadata (${response.status})`)
  }

  return response.json() as Promise<unknown>
}

/**
 * Clear the locally cached ship NFT record for an account.
 */
export function clearShipNFTCache(accountId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getCacheKey(accountId))
}

/**
 * Fetch ship NFT metadata from the Stellar network.
 *
 * Resolves the ship asset and metadata URI from the account's data entries
 * and fetches remote metadata when available. Results are cached in
 * localStorage for 30 seconds.
 *
 * @param accountId - The Stellar public key of the ship owner
 * @param config    - Optional network config override
 * @param options.forceRefresh - Bypass the local cache
 *
 * @example
 * const ship = await fetchShipNFT('G...')
 */
export async function fetchShipNFT(
  accountId: string,
  config?: StellarNetworkConfig,
  options: { forceRefresh?: boolean } = {}
): Promise<ShipNFTRecord | null> {
  if (!options.forceRefresh) {
    const cached = readCache(accountId)
    if (cached !== null) return cached
  }

  const horizonUrl = (config?.horizonUrl ?? 'https://horizon-testnet.stellar.org').replace(
    /\/+$/,
    ''
  )
  const response = await fetch(`${horizonUrl}/accounts/${accountId}`)

  if (!response.ok) {
    if (response.status === 404) {
      writeCache(accountId, null)
      return null
    }
    throw new Error(`Failed to fetch ship account (${response.status})`)
  }

  const account = (await response.json()) as AccountRecord
  const asset = extractShipAsset(account)
  const metadataUri = extractMetadataUri(account)

  if (!asset && !metadataUri) {
    writeCache(accountId, null)
    return null
  }

  const inlineMetadata =
    metadataUri && metadataUri.startsWith('{') ? parseMetadata(tryParseJson(metadataUri)) : null
  const remoteMetadata =
    metadataUri && !metadataUri.startsWith('{')
      ? parseMetadata(await fetchJson(normalizeMetadataUrl(metadataUri)))
      : null

  const metadata =
    inlineMetadata ??
    remoteMetadata ??
    parseMetadata({
      name: asset ? `${asset.code} ship` : 'Unregistered ship',
      description: 'NFT metadata has not been published yet.',
      model: asset?.code ?? 'unknown',
      attributes: [],
    })

  const record: ShipNFTRecord = {
    accountId,
    assetCode: asset?.code ?? metadata.model ?? 'SHIPNFT',
    issuer: asset?.issuer,
    metadata,
    metadataUri,
    fetchedAt: new Date().toISOString(),
  }

  writeCache(accountId, record)
  return record
}
