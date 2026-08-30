import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetAccount = vi.fn()
const mockPrepareTransaction = vi.fn()
const mockSendTransaction = vi.fn()
const mockGetTransaction = vi.fn()

vi.mock('@stellar/stellar-sdk', () => {
  class MockServer {
    getAccount = mockGetAccount
    prepareTransaction = mockPrepareTransaction
    sendTransaction = mockSendTransaction
    getTransaction = mockGetTransaction
  }

  class MockContract {
    call = vi.fn().mockReturnValue('mock-operation')
  }

  class MockTransactionBuilder {
    addOperation = vi.fn().mockReturnThis()
    setTimeout = vi.fn().mockReturnThis()
    build = vi.fn().mockReturnValue('mock-transaction')
  }

  return {
    Contract: MockContract,
    TransactionBuilder: Object.assign(MockTransactionBuilder, {
      fromXDR: vi.fn().mockReturnValue('mock-parsed-tx'),
    }),
    BASE_FEE: '100',
    nativeToScVal: vi.fn().mockReturnValue('mock-sc-val'),
    rpc: { Server: MockServer },
  }
})

vi.mock('@/config/stellar', () => ({
  getActiveStellarConfig: () => ({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  }),
}))

vi.mock('@/utils/stellar/responseParser', () => ({
  parseContractResponseXdr: vi.fn().mockReturnValue({
    value: { resource_type: 'nebulite', amount: BigInt(42) },
  }),
}))

vi.mock('@/utils/stellar/retry', () => ({
  retryAsync: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
  isRetryableStellarError: vi.fn().mockReturnValue(false),
}))

import { SorobanContractClient, ContractError } from '../soroban'

describe('SorobanContractClient', () => {
  let client: SorobanContractClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockGetAccount.mockResolvedValue({ accountId: 'GABC...', sequence: '1' })
    mockPrepareTransaction.mockResolvedValue({ toXDR: () => 'mock-xdr' })
    mockSendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'tx-hash-123' })
    mockGetTransaction.mockResolvedValue({
      status: 'SUCCESS',
      returnValue: { toXDR: () => 'mock-return-xdr' },
    })
    client = new SorobanContractClient('CABC123')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('buildScanTransaction', () => {
    it('builds an unsigned XDR for scan_nebula', async () => {
      const xdr = await client.buildScanTransaction({
        nebulaId: 'nebula-1',
        scannerPublicKey: 'GABC...',
      })
      expect(xdr).toBeDefined()
      expect(mockGetAccount).toHaveBeenCalledWith('GABC...')
      expect(mockPrepareTransaction).toHaveBeenCalled()
    })

    it('uses custom fee when provided', async () => {
      await client.buildScanTransaction(
        { nebulaId: 'nebula-1', scannerPublicKey: 'GABC...' },
        { fee: '500' }
      )
      expect(mockPrepareTransaction).toHaveBeenCalled()
    })

    it('uses custom timeout when provided', async () => {
      await client.buildScanTransaction(
        { nebulaId: 'nebula-1', scannerPublicKey: 'GABC...' },
        { timeoutSeconds: 60 }
      )
      expect(mockPrepareTransaction).toHaveBeenCalled()
    })
  })

  describe('submitScanTransaction', () => {
    it('submits a signed transaction and returns result', async () => {
      const promise = client.submitScanTransaction('signed-xdr')
      await vi.advanceTimersByTimeAsync(2000)
      const result = await promise
      expect(result).toEqual({
        resourceType: 'nebulite',
        amount: 42,
        transactionHash: 'tx-hash-123',
      })
    })

    it('throws ContractError on transaction ERROR status', async () => {
      mockSendTransaction.mockResolvedValueOnce({
        status: 'ERROR',
        errorResult: { toXDR: () => 'error-xdr' },
      })

      await expect(client.submitScanTransaction('signed-xdr')).rejects.toThrow(ContractError)
    })

    it('throws ContractError when transaction fails on-chain', async () => {
      mockGetTransaction.mockResolvedValueOnce({ status: 'FAILED' })

      const promise = client.submitScanTransaction('signed-xdr').catch((e) => e)
      await vi.advanceTimersByTimeAsync(2000)

      const error = await promise
      expect(error).toBeInstanceOf(ContractError)
      expect(error.message).toBe('Transaction failed on-chain')
    })

    it('throws ContractError on timeout', async () => {
      mockGetTransaction.mockResolvedValue({ status: 'PENDING' })

      const promise = client.submitScanTransaction('signed-xdr').catch((e) => e)

      for (let i = 0; i < 22; i++) {
        await vi.advanceTimersByTimeAsync(1000)
      }

      const error = await promise
      expect(error).toBeInstanceOf(ContractError)
      expect(error.message).toBe('Transaction confirmation timed out')
    })
  })

  describe('ContractError', () => {
    it('has correct name property', () => {
      const err = new ContractError('test error')
      expect(err.name).toBe('ContractError')
      expect(err.message).toBe('test error')
      expect(err instanceof Error).toBe(true)
    })
  })
})
