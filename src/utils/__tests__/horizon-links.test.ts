import { describe, expect, it } from 'vitest'
import {
  getAccountExplorerUrl,
  getExplorerBaseUrl,
  getTransactionExplorerUrl,
  isValidPublicKey,
  isValidTransactionHash,
  shortenTransactionHash,
  STELLAR_EXPERT_BASE_URLS,
} from '../horizon-links'

const HASH = 'a'.repeat(64)
const PUBLIC_KEY = `G${'A'.repeat(55)}`

describe('horizon-links', () => {
  describe('getExplorerBaseUrl', () => {
    it('returns the Stellar Expert base for each network', () => {
      expect(getExplorerBaseUrl('mainnet')).toBe(STELLAR_EXPERT_BASE_URLS.mainnet)
      expect(getExplorerBaseUrl('testnet')).toBe(STELLAR_EXPERT_BASE_URLS.testnet)
      expect(getExplorerBaseUrl('futurenet')).toBe(STELLAR_EXPERT_BASE_URLS.futurenet)
    })

    it('falls back to testnet for an unknown network', () => {
      expect(getExplorerBaseUrl('sandbox' as never)).toBe(STELLAR_EXPERT_BASE_URLS.testnet)
    })

    it('defaults to testnet', () => {
      expect(getExplorerBaseUrl()).toBe(STELLAR_EXPERT_BASE_URLS.testnet)
    })
  })

  describe('isValidTransactionHash', () => {
    it('accepts a 64-character hex digest in either case', () => {
      expect(isValidTransactionHash(HASH)).toBe(true)
      expect(isValidTransactionHash('ABCDEF0123456789'.repeat(4))).toBe(true)
    })

    it('rejects short, non-hex, or missing hashes', () => {
      expect(isValidTransactionHash('abc')).toBe(false)
      expect(isValidTransactionHash('z'.repeat(64))).toBe(false)
      expect(isValidTransactionHash(null)).toBe(false)
      expect(isValidTransactionHash(undefined)).toBe(false)
    })
  })

  describe('isValidPublicKey', () => {
    it('accepts a Stellar G address', () => {
      expect(isValidPublicKey(PUBLIC_KEY)).toBe(true)
    })

    it('rejects wrong length, prefix, or missing keys', () => {
      expect(isValidPublicKey(`S${'A'.repeat(55)}`)).toBe(false)
      expect(isValidPublicKey('GABC')).toBe(false)
      expect(isValidPublicKey(null)).toBe(false)
    })
  })

  describe('getTransactionExplorerUrl', () => {
    it('builds a Stellar Expert transaction URL for the network', () => {
      expect(getTransactionExplorerUrl(HASH, 'testnet')).toBe(
        `https://stellar.expert/explorer/testnet/tx/${HASH}`
      )
      expect(getTransactionExplorerUrl(HASH, 'mainnet')).toBe(
        `https://stellar.expert/explorer/public/tx/${HASH}`
      )
      expect(getTransactionExplorerUrl(HASH, 'futurenet')).toBe(
        `https://stellar.expert/explorer/futurenet/tx/${HASH}`
      )
    })

    it('returns null for an invalid hash so no broken link is rendered', () => {
      expect(getTransactionExplorerUrl('not-a-hash')).toBeNull()
      expect(getTransactionExplorerUrl(null)).toBeNull()
    })
  })

  describe('getAccountExplorerUrl', () => {
    it('builds a Stellar Expert account URL', () => {
      expect(getAccountExplorerUrl(PUBLIC_KEY, 'testnet')).toBe(
        `https://stellar.expert/explorer/testnet/account/${PUBLIC_KEY}`
      )
    })

    it('returns null for an invalid public key', () => {
      expect(getAccountExplorerUrl('GABC')).toBeNull()
    })
  })

  describe('shortenTransactionHash', () => {
    it('shortens valid hashes with an ellipsis', () => {
      expect(shortenTransactionHash(HASH)).toBe(`${'a'.repeat(8)}…${'a'.repeat(8)}`)
    })

    it('returns invalid hashes unchanged', () => {
      expect(shortenTransactionHash('abc')).toBe('abc')
    })
  })
})
