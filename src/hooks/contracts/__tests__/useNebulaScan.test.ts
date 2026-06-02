import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNebulaScan } from '../useNebulaScan'

// vi.hoisted so these are available inside the vi.mock factory (which is hoisted above declarations)
const { mockBuildScanTransaction, mockSubmitScanTransaction } = vi.hoisted(() => ({
  mockBuildScanTransaction: vi.fn(),
  mockSubmitScanTransaction: vi.fn(),
}))

// vitest v4 requires 'function' or 'class' for constructor mocks, not arrow functions
vi.mock('@services/contracts', () => {
  class SorobanContractClient {
    buildScanTransaction = mockBuildScanTransaction
    submitScanTransaction = mockSubmitScanTransaction
  }

  class ContractError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ContractError'
    }
  }

  return { SorobanContractClient, ContractError }
})

vi.mock('@/config/stellar', () => ({
  getActiveStellarConfig: vi.fn().mockReturnValue({
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  }),
}))

const MOCK_CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'
const MOCK_PUBLIC_KEY = 'GAHTJRCKMIQWJSLS6OGCHZMAKSDBUQGIT4AJGBE6KCAJBKNNCLSYTRDS'
const MOCK_NEBULA_ID = 'nebula-sector-7g'
const MOCK_XDR = 'AAAAAAAAAAAAAAAA=='
const MOCK_SIGNED_XDR = 'BBBBBBBBBBBBBBBB=='

const MOCK_SCAN_RESULT = {
  resourceType: 'nebulite' as const,
  amount: 42,
  transactionHash: 'abc123hash',
}

function makeSignTransaction(returnValue: string | null = MOCK_SIGNED_XDR) {
  return vi.fn().mockResolvedValue(returnValue)
}

describe('useNebulaScan', () => {
  beforeEach(() => {
    mockBuildScanTransaction.mockReset()
    mockSubmitScanTransaction.mockReset()
    mockBuildScanTransaction.mockResolvedValue(MOCK_XDR)
    mockSubmitScanTransaction.mockResolvedValue(MOCK_SCAN_RESULT)
  })

  it('initialises with idle state', () => {
    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.result).toBeNull()
  })

  it('sets isLoading while scanning', async () => {
    let resolveSubmit: (v: typeof MOCK_SCAN_RESULT) => void
    mockSubmitScanTransaction.mockReturnValue(
      new Promise<typeof MOCK_SCAN_RESULT>((res) => {
        resolveSubmit = res
      })
    )

    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    act(() => {
      void result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    await waitFor(() => expect(result.current.isLoading).toBe(true))

    await act(async () => {
      resolveSubmit!(MOCK_SCAN_RESULT)
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('returns scan result on success', async () => {
    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(result.current.result).toEqual(MOCK_SCAN_RESULT)
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('passes nebulaId and scannerPublicKey to the contract client', async () => {
    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(mockBuildScanTransaction).toHaveBeenCalledWith({
      nebulaId: MOCK_NEBULA_ID,
      scannerPublicKey: MOCK_PUBLIC_KEY,
    })
  })

  it('passes unsigned XDR to signTransaction and uses signed XDR to submit', async () => {
    const signTransaction = makeSignTransaction(MOCK_SIGNED_XDR)
    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction })
    )

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(signTransaction).toHaveBeenCalledWith(MOCK_XDR)
    expect(mockSubmitScanTransaction).toHaveBeenCalledWith(MOCK_SIGNED_XDR)
  })

  it('sets error and returns null when signing is cancelled', async () => {
    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction(null) })
    )

    let scanResult: unknown
    await act(async () => {
      scanResult = await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(scanResult).toBeNull()
    expect(result.current.error).toBeTruthy()
    expect(result.current.result).toBeNull()
    expect(mockSubmitScanTransaction).not.toHaveBeenCalled()
  })

  it('sets error on contract build failure', async () => {
    mockBuildScanTransaction.mockRejectedValue(new Error('Build failed'))

    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(result.current.error).toBe('Build failed')
    expect(result.current.result).toBeNull()
  })

  it('sets error on contract submit failure', async () => {
    mockSubmitScanTransaction.mockRejectedValue(new Error('On-chain rejection'))

    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(result.current.error).toBe('On-chain rejection')
    expect(result.current.result).toBeNull()
  })

  it('wraps non-Error throws in a fallback message', async () => {
    mockSubmitScanTransaction.mockRejectedValue('not an error object')

    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(result.current.error).toBeTruthy()
    expect(typeof result.current.error).toBe('string')
  })

  it('reset clears error and result', async () => {
    mockSubmitScanTransaction.mockRejectedValue(new Error('Failed'))

    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(result.current.error).toBeTruthy()

    act(() => {
      result.current.reset()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.result).toBeNull()
  })

  it('clears previous result before each new scan', async () => {
    const { result } = renderHook(() =>
      useNebulaScan({ contractId: MOCK_CONTRACT_ID, signTransaction: makeSignTransaction() })
    )

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(result.current.result).toEqual(MOCK_SCAN_RESULT)

    mockSubmitScanTransaction.mockRejectedValue(new Error('Network error'))

    await act(async () => {
      await result.current.scan(MOCK_NEBULA_ID, MOCK_PUBLIC_KEY)
    })

    expect(result.current.result).toBeNull()
    expect(result.current.error).toBe('Network error')
  })
})
