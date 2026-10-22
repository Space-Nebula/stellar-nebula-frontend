import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWallet } from '@/contexts/WalletContext'
import { isWalletConnectConfigured } from '@config/walletconnect'
import { useWalletConnect } from '../useWalletConnect'
import type { WalletState } from '@/types'

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: vi.fn(),
}))

vi.mock('@config/walletconnect', () => ({
  isWalletConnectConfigured: vi.fn(() => true),
}))

const contextMocks = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  signTransaction: vi.fn().mockResolvedValue('SIGNED_XDR'),
  clearError: vi.fn(),
}

function mockWallet(
  overrides: Partial<WalletState> = {},
  isLoading = false,
  error: string | null = null
) {
  vi.mocked(useWallet).mockReturnValue({
    walletState: {
      isConnected: true,
      publicKey: 'GWALLETCONNECT',
      walletType: 'walletconnect',
      network: 'testnet',
      ...overrides,
    },
    isLoading,
    error,
    connect: contextMocks.connect,
    disconnect: contextMocks.disconnect,
    signTransaction: contextMocks.signTransaction,
    clearError: contextMocks.clearError,
  } as never)
}

describe('useWalletConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isWalletConnectConfigured).mockReturnValue(true)
    mockWallet()
  })

  it('reports the configured and connected state', () => {
    const { result } = renderHook(() => useWalletConnect())

    expect(result.current.isConfigured).toBe(true)
    expect(result.current.isAvailable).toBe(true)
    expect(result.current.isConnected).toBe(true)
    expect(result.current.publicKey).toBe('GWALLETCONNECT')
    expect(result.current.network).toBe('testnet')
  })

  it('reports unconfigured when the project id is missing', () => {
    vi.mocked(isWalletConnectConfigured).mockReturnValue(false)

    const { result } = renderHook(() => useWalletConnect())

    expect(result.current.isConfigured).toBe(false)
  })

  it('connects through the wallet context', async () => {
    const { result } = renderHook(() => useWalletConnect())

    await act(async () => {
      await result.current.connect()
    })

    expect(contextMocks.connect).toHaveBeenCalledWith('walletconnect')
  })

  it('does not treat another wallet type as a WalletConnect session', () => {
    mockWallet({ walletType: 'freighter' })

    const { result } = renderHook(() => useWalletConnect())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.publicKey).toBeNull()
    expect(result.current.network).toBeNull()
  })

  it('signs through the active WalletConnect session', async () => {
    const { result } = renderHook(() => useWalletConnect())

    let signed: string | null = null
    await act(async () => {
      signed = await result.current.signTransaction('RAW_XDR')
    })

    expect(signed).toBe('SIGNED_XDR')
    expect(contextMocks.signTransaction).toHaveBeenCalledWith('RAW_XDR')
  })

  it('refuses to sign when WalletConnect is not the active wallet', async () => {
    mockWallet({ walletType: 'albedo' })

    const { result } = renderHook(() => useWalletConnect())

    let signed: string | null = 'unchanged'
    await act(async () => {
      signed = await result.current.signTransaction('RAW_XDR')
    })

    expect(signed).toBeNull()
    expect(contextMocks.signTransaction).not.toHaveBeenCalled()
  })

  it('disconnects and clears errors through the context', () => {
    const { result } = renderHook(() => useWalletConnect())

    act(() => result.current.disconnect())
    act(() => result.current.clearError())

    expect(contextMocks.disconnect).toHaveBeenCalled()
    expect(contextMocks.clearError).toHaveBeenCalled()
  })

  it('surfaces connecting state and errors from the context', () => {
    mockWallet({}, true, 'Failed to establish WalletConnect session')

    const { result } = renderHook(() => useWalletConnect())

    expect(result.current.isConnecting).toBe(true)
    expect(result.current.error).toBe('Failed to establish WalletConnect session')
  })
})
