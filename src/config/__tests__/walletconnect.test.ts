import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildWalletConnectNamespaces,
  getSupportedWalletConnectChains,
  getWalletConnectChainId,
  getWalletConnectMetadata,
  getWalletConnectProjectId,
  isWalletConnectConfigured,
  WALLETCONNECT_STELLAR_METHODS,
} from '../walletconnect'

describe('walletconnect config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('getWalletConnectChainId', () => {
    it('maps Stellar networks to CAIP-2 chain ids', () => {
      expect(getWalletConnectChainId('mainnet')).toBe('stellar:pubnet')
      expect(getWalletConnectChainId('testnet')).toBe('stellar:testnet')
    })

    it('pairs futurenet against testnet', () => {
      expect(getWalletConnectChainId('futurenet')).toBe('stellar:testnet')
    })
  })

  it('lists unique supported chains', () => {
    expect(getSupportedWalletConnectChains().sort()).toEqual(['stellar:pubnet', 'stellar:testnet'])
  })

  describe('project id', () => {
    it('reads and trims VITE_WALLETCONNECT_PROJECT_ID', () => {
      vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', '  project-123  ')
      expect(getWalletConnectProjectId()).toBe('project-123')
      expect(isWalletConnectConfigured()).toBe(true)
    })

    it('treats a missing or blank project id as unconfigured', () => {
      vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', '   ')
      expect(getWalletConnectProjectId()).toBe('')
      expect(isWalletConnectConfigured()).toBe(false)
    })
  })

  describe('buildWalletConnectNamespaces', () => {
    it('requests the Stellar methods on the selected chain', () => {
      const namespaces = buildWalletConnectNamespaces('testnet')

      expect(namespaces.stellar.methods).toEqual([...WALLETCONNECT_STELLAR_METHODS])
      expect(namespaces.stellar.chains).toEqual(['stellar:testnet'])
      expect(namespaces.stellar.events).toEqual([])
    })
  })

  describe('getWalletConnectMetadata', () => {
    it('advertises the app origin and icon', () => {
      const metadata = getWalletConnectMetadata()

      expect(metadata.name).toBe('Nebula Nomad')
      expect(metadata.url).toBe(window.location.origin)
      expect(metadata.icons[0]).toBe(`${window.location.origin}/icon-192.png`)
    })
  })
})
