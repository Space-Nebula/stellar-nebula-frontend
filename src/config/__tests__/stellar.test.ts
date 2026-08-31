import { Networks } from '@stellar/stellar-sdk'
import { describe, expect, it, vi } from 'vitest'
import {
  STELLAR_NETWORK_CONFIGS,
  checkStellarConnection,
  createHorizonServer,
  createStellarRpcServer,
  getActiveStellarConfig,
  getStellarNetworkConfig,
  type StellarConnectionClients,
} from '../stellar'

describe('stellar config', () => {
  it('defines testnet and futurenet network defaults', () => {
    expect(STELLAR_NETWORK_CONFIGS.testnet).toMatchObject({
      network: 'testnet',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      networkPassphrase: Networks.TESTNET,
    })

    expect(STELLAR_NETWORK_CONFIGS.futurenet).toMatchObject({
      network: 'futurenet',
      rpcUrl: 'https://rpc-futurenet.stellar.org',
      horizonUrl: 'https://horizon-futurenet.stellar.org',
      networkPassphrase: Networks.FUTURENET,
    })
  })

  it('resolves the requested network config', () => {
    expect(getStellarNetworkConfig('futurenet')).toBe(STELLAR_NETWORK_CONFIGS.futurenet)
  })

  it('allows environment endpoint overrides', () => {
    expect(
      getActiveStellarConfig({
        STELLAR_NETWORK: 'testnet',
        STELLAR_RPC_URL: 'https://rpc.example.test',
        STELLAR_HORIZON_URL: 'https://horizon.example.test',
        STELLAR_PASSPHRASE: 'Example Passphrase',
        NEBULA_CONTRACT_ID: 'CNEBULA',
        TOKEN_CONTRACT_ID: 'CTOKEN',
      })
    ).toEqual({
      network: 'testnet',
      rpcUrl: 'https://rpc.example.test',
      horizonUrl: 'https://horizon.example.test',
      networkPassphrase: 'Example Passphrase',
      nebulaContractId: 'CNEBULA',
      tokenContractId: 'CTOKEN',
    })
  })

  it('keeps per-network default contract IDs when none are overridden', () => {
    const config = getActiveStellarConfig({ STELLAR_NETWORK: 'testnet' })
    expect(typeof config.nebulaContractId).toBe('string')
    expect(typeof config.tokenContractId).toBe('string')
  })

  it('creates Stellar SDK clients from config', () => {
    const config = getStellarNetworkConfig('testnet')

    expect(createStellarRpcServer(config)).toBeDefined()
    expect(createHorizonServer(config)).toBeDefined()
  })

  it('checks RPC and Horizon connectivity with injectable clients', async () => {
    const clients = {
      rpcServer: {
        getHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
        getNetwork: vi.fn().mockResolvedValue({ passphrase: Networks.FUTURENET }),
      },
      horizonServer: {
        root: vi.fn().mockResolvedValue({ horizon_version: 'test' }),
      },
    } satisfies StellarConnectionClients

    await expect(
      checkStellarConnection(getStellarNetworkConfig('futurenet'), clients)
    ).resolves.toEqual({
      network: 'futurenet',
      rpcHealthy: true,
      rpcStatus: 'healthy',
      horizonConnected: true,
      networkPassphrase: Networks.FUTURENET,
    })
  })
})
