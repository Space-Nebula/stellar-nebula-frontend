import { xdr } from '@stellar/stellar-sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHorizonServer, createStellarRpcServer } from '@config/stellar'
import { formatBalance } from '../balance'
import {
  buildBatchTransaction,
  calculateBatchFee,
  createBatchOperation,
  createBatchTransactionBuilder,
  validateBatchOperations,
} from '../batchTransaction'
import {
  MIN_TRANSACTION_FEE_STROOPS,
  estimateTransactionFee,
  formatFeeInXlm,
} from '../feeEstimation'
import {
  ContractResponseParseError,
  parseContractResponseXdr,
  parseResponseValue,
  parseSimulationResponse,
} from '../responseParser'
import { isRetryableStellarError, retryAsync } from '../retry'
import { simulateContractTransaction } from '../simulate'

vi.mock('@config/stellar', () => ({
  createHorizonServer: vi.fn(),
  createStellarRpcServer: vi.fn(),
  getActiveStellarConfig: vi.fn(() => ({
    rpcUrl: 'https://rpc.test',
    horizonUrl: 'https://horizon.test',
    networkPassphrase: 'Test SDF Network ; September 2015',
  })),
}))

describe('Stellar utility functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats native and issued balances for display', () => {
    expect(formatBalance({ asset_type: 'native', balance: '12.5000000' } as never)).toEqual({
      assetCode: 'XLM',
      balance: '12.5000000',
      assetType: 'native',
      isNative: true,
    })

    expect(
      formatBalance({
        asset_type: 'credit_alphanum4',
        asset_code: 'STAR',
        asset_issuer: 'GISSUER',
        balance: '8.0000000',
      } as never)
    ).toEqual({
      assetCode: 'STAR',
      assetIssuer: 'GISSUER',
      balance: '8.0000000',
      assetType: 'credit_alphanum4',
      isNative: false,
    })

    expect(createHorizonServer).not.toHaveBeenCalled()
  })

  it('builds and validates ordered batch transactions', () => {
    const inspect = createBatchOperation({
      id: 'inspect',
      kind: 'inspect',
      description: 'Inspect ship',
      payload: { shipId: 'ship-1' },
      feeStroops: 25,
    })
    const install = createBatchOperation({
      id: 'install',
      kind: 'install',
      description: 'Install module',
      payload: { module: 'cargo' },
      dependsOn: ['inspect'],
      feeStroops: 40,
    })

    const plan = buildBatchTransaction([inspect, install], { baseFeeStroops: 100 })

    expect(plan.isValid).toBe(true)
    expect(plan.totalOperations).toBe(2)
    expect(plan.totalFeeStroops).toBe(265)
    expect(calculateBatchFee([inspect, install], 100)).toBe(265)
  })

  it('reports duplicate and missing batch dependencies', () => {
    const duplicate = createBatchOperation({
      id: 'same',
      kind: 'one',
      description: 'One',
      payload: {},
    })
    const missingDependency = createBatchOperation({
      id: 'same',
      kind: 'two',
      description: 'Two',
      payload: {},
      dependsOn: ['missing'],
    })

    expect(validateBatchOperations([])).toEqual([
      expect.objectContaining({ code: 'EMPTY_BATCH' }),
    ])
    expect(validateBatchOperations([duplicate, missingDependency])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_OPERATION' }),
        expect.objectContaining({ code: 'MISSING_DEPENDENCY' }),
      ])
    )
  })

  it('supports mutable batch builder operations without leaking references', () => {
    const first = createBatchOperation({
      id: 'first',
      kind: 'first',
      description: 'First',
      payload: {},
    })
    const second = createBatchOperation({
      id: 'second',
      kind: 'second',
      description: 'Second',
      payload: {},
    })

    const builder = createBatchTransactionBuilder({ maxOperations: 1 })
    const listed = builder.addOperation(first).list()
    builder.insertOperation(0, second)

    expect(listed).toEqual([first])
    expect(builder.build().errors).toEqual([
      expect.objectContaining({ code: 'TOO_MANY_OPERATIONS' }),
    ])
    expect(builder.clear().build().errors[0]).toEqual(
      expect.objectContaining({ code: 'EMPTY_BATCH' })
    )
  })

  it('estimates fees with live stats and fallback formatting', async () => {
    vi.mocked(createStellarRpcServer).mockReturnValue({
      getFeeStats: vi.fn().mockResolvedValue({ p95_inclusion_fee: 240 }),
    } as never)

    await expect(estimateTransactionFee({ operationCount: 3 })).resolves.toEqual({
      stroops: 900,
      xlm: '0.0000900',
      baseFeeStroops: 240,
      bufferMultiplier: 1.25,
      networkCondition: 'busy',
    })
    expect(formatFeeInXlm(100)).toBe('0.0000100 XLM')
    expect(MIN_TRANSACTION_FEE_STROOPS).toBeDefined()
  })

  it('falls back to minimum fees when fee stats fail', async () => {
    vi.mocked(createStellarRpcServer).mockReturnValue({
      getFeeStats: vi.fn().mockRejectedValue(new Error('network down')),
    } as never)

    await expect(
      estimateTransactionFee({ operationCount: 0, safetyBufferMultiplier: 1 })
    ).resolves.toMatchObject({
      stroops: 100,
      baseFeeStroops: 100,
      networkCondition: 'calm',
    })
  })

  it('parses contract response XDR and simulation envelopes', () => {
    const responseXdr = xdr.ScVal.scvString('scan-ok').toXDR('base64')

    expect(parseContractResponseXdr<string>(responseXdr).value).toBe('scan-ok')
    expect(parseResponseValue<string>({ value: responseXdr })).toBe('scan-ok')
    expect(
      parseSimulationResponse<string>({
        results: [{ xdr: responseXdr }],
        latestLedger: 123,
        minResourceFee: '100',
        auth: ['auth-xdr'],
        events: ['event-xdr'],
      })
    ).toMatchObject({
      status: 'success',
      value: 'scan-ok',
      latestLedger: 123,
      minResourceFee: '100',
      auth: ['auth-xdr'],
      events: ['event-xdr'],
    })
  })

  it('surfaces parse errors for invalid payloads', () => {
    expect(() => parseContractResponseXdr('not-base64')).toThrow(ContractResponseParseError)
    expect(() => parseResponseValue({ ok: true })).toThrow(ContractResponseParseError)
    expect(parseSimulationResponse({ error: 'simulation failed' })).toMatchObject({
      status: 'error',
      value: null,
      error: 'simulation failed',
    })
  })

  it('retries retryable operations and skips user cancellations', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce('ok')

    await expect(
      retryAsync(operation, { retries: 1, initialDelayMs: 0, maxDelayMs: 0 })
    ).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(2)
    expect(isRetryableStellarError(new Error('User rejected request'))).toBe(false)
    expect(isRetryableStellarError({ response: { status: 503 } })).toBe(true)
  })

  it('simulates contract transactions through RPC and parses the result', async () => {
    const responseXdr = xdr.ScVal.scvBool(true).toXDR('base64')
    const simulateTransaction = vi.fn().mockResolvedValue({ xdr: responseXdr })
    vi.mocked(createStellarRpcServer).mockReturnValue({ simulateTransaction } as never)

    await expect(simulateContractTransaction<boolean>('AAAA', { retries: 0 })).resolves.toMatchObject({
      status: 'success',
      value: true,
    })
    expect(simulateTransaction).toHaveBeenCalledWith({ transaction: 'AAAA' })
  })
})
