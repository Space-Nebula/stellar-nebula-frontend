import type { StellarNetwork } from '@/types'

/**
 * Stellar Expert explorer bases per network. Stellar Expert is used instead of
 * Horizon itself because it renders transaction result codes, operations and
 * fees — the details a person needs when a transaction fails.
 */
export const STELLAR_EXPERT_BASE_URLS: Record<StellarNetwork, string> = {
  mainnet: 'https://stellar.expert/explorer/public',
  testnet: 'https://stellar.expert/explorer/testnet',
  futurenet: 'https://stellar.expert/explorer/futurenet',
}

const TRANSACTION_HASH_PATTERN = /^[0-9a-f]{64}$/i
const PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/

/** Base explorer URL for a network; unknown networks fall back to testnet. */
export function getExplorerBaseUrl(network: StellarNetwork = 'testnet'): string {
  return STELLAR_EXPERT_BASE_URLS[network] ?? STELLAR_EXPERT_BASE_URLS.testnet
}

/** True for a 32-byte transaction hash encoded as 64 hex characters. */
export function isValidTransactionHash(hash: string | null | undefined): hash is string {
  return typeof hash === 'string' && TRANSACTION_HASH_PATTERN.test(hash)
}

/** True for a standard Stellar `G…` account public key. */
export function isValidPublicKey(publicKey: string | null | undefined): publicKey is string {
  return typeof publicKey === 'string' && PUBLIC_KEY_PATTERN.test(publicKey)
}

/**
 * Explorer URL for a transaction, or null when the hash is not a valid
 * 64-character hex digest (for example an optimistic placeholder).
 */
export function getTransactionExplorerUrl(
  hash: string | null | undefined,
  network: StellarNetwork = 'testnet'
): string | null {
  if (!isValidTransactionHash(hash)) return null
  return `${getExplorerBaseUrl(network)}/tx/${hash}`
}

/** Explorer URL for an account, or null for an invalid public key. */
export function getAccountExplorerUrl(
  publicKey: string | null | undefined,
  network: StellarNetwork = 'testnet'
): string | null {
  if (!isValidPublicKey(publicKey)) return null
  return `${getExplorerBaseUrl(network)}/account/${publicKey}`
}

/** Shorten a hash for display: `abcdef12…34567890`. */
export function shortenTransactionHash(hash: string, head = 8, tail = 8): string {
  if (!isValidTransactionHash(hash)) return hash
  if (hash.length <= head + tail + 1) return hash
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`
}
