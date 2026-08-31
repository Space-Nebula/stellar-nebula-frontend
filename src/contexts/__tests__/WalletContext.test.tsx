import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import type * as WalletsService from '@services/wallets'
import { WalletProvider, useWallet } from '../WalletContext'

// Mock wallet services
vi.mock('@services/wallets', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof WalletsService
  return {
    ...actual,
    isFreighterInstalled: vi.fn().mockResolvedValue(true),
    isWalletConnectAvailable: vi.fn().mockReturnValue(false),
    connectWalletConnect: vi.fn(),
    signTransactionWithWalletConnect: vi.fn(),
    getWalletConnectNetwork: vi.fn(),
    disconnectWalletConnect: vi.fn(),
    loadWalletConnectSession: vi.fn().mockReturnValue(null),
    connectFreighter: vi.fn().mockResolvedValue('GFREIGHTER123'),
    getFreighterNetwork: vi.fn().mockResolvedValue('testnet'),
    isAlbedoAvailable: vi.fn().mockReturnValue(true),
    connectAlbedo: vi.fn().mockResolvedValue('GALBEDO123'),
    getAlbedoNetwork: vi.fn().mockResolvedValue('testnet'),
    signTransactionWithFreighter: vi.fn().mockResolvedValue('SIGNED_XDR'),
    signTransactionWithAlbedo: vi.fn().mockResolvedValue('SIGNED_ALBEDO_XDR'),
  }
})

function TestConsumer() {
  const { walletState, connect, disconnect, isLoading, error, isReconnecting, reconnectError } =
    useWallet()
  return (
    <div>
      <span data-testid="connected">{String(walletState.isConnected)}</span>
      <span data-testid="pubkey">{walletState.publicKey ?? 'none'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="isReconnecting">{String(isReconnecting)}</span>
      <span data-testid="reconnectError">{reconnectError ?? 'none'}</span>
      <button onClick={() => connect('freighter')}>Connect Freighter</button>
      <button onClick={() => connect('albedo')}>Connect Albedo</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <WalletProvider>
      <TestConsumer />
    </WalletProvider>
  )
}

describe('WalletProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('starts in a disconnected state', () => {
    renderWithProvider()
    expect(screen.getByTestId('connected').textContent).toBe('false')
    expect(screen.getByTestId('pubkey').textContent).toBe('none')
  })

  it('connects via Freighter and updates state', async () => {
    renderWithProvider()
    await act(async () => {
      await userEvent.click(screen.getByText('Connect Freighter'))
    })
    expect(screen.getByTestId('connected').textContent).toBe('true')
    expect(screen.getByTestId('pubkey').textContent).toBe('GFREIGHTER123')
  })

  it('connects via Albedo and updates state', async () => {
    renderWithProvider()
    await act(async () => {
      await userEvent.click(screen.getByText('Connect Albedo'))
    })
    expect(screen.getByTestId('connected').textContent).toBe('true')
    expect(screen.getByTestId('pubkey').textContent).toBe('GALBEDO123')
  })

  it('disconnects and resets state', async () => {
    renderWithProvider()
    await act(async () => {
      await userEvent.click(screen.getByText('Connect Freighter'))
    })
    await act(async () => {
      await userEvent.click(screen.getByText('Disconnect'))
    })
    expect(screen.getByTestId('connected').textContent).toBe('false')
    expect(screen.getByTestId('pubkey').textContent).toBe('none')
  })

  it('throws when useWallet is used outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useWallet must be used inside <WalletProvider>')
    consoleError.mockRestore()
  })

  it('persists connection to localStorage', async () => {
    renderWithProvider()
    await act(async () => {
      await userEvent.click(screen.getByText('Connect Freighter'))
    })
    const stored = localStorage.getItem('stellar-nebula:wallet')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.publicKey).toBe('GFREIGHTER123')
  })

  it('clears localStorage on disconnect', async () => {
    localStorage.setItem(
      'stellar-nebula:resource-store',
      JSON.stringify({ inventory: { nebulite: 100 } })
    )
    localStorage.setItem(
      'stellar-nebula:balance-cache:GFREIGHTER123',
      JSON.stringify([{ assetCode: 'XLM', balance: '10' }])
    )

    renderWithProvider()
    await act(async () => {
      await userEvent.click(screen.getByText('Connect Freighter'))
    })
    await act(async () => {
      await userEvent.click(screen.getByText('Disconnect'))
    })
    expect(localStorage.getItem('stellar-nebula:wallet')).toBeNull()
    expect(localStorage.getItem('stellar-nebula:balance-cache:GFREIGHTER123')).toBeNull()
    expect(localStorage.getItem('stellar-nebula:resource-store')).toBeNull()
  })

  describe('Auto-reconnect', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('does not auto-reconnect when no persisted wallet exists', () => {
      renderWithProvider()

      // Should not be reconnecting if there's no persisted wallet
      expect(screen.getByTestId('isReconnecting').textContent).toBe('false')
      expect(screen.getByTestId('connected').textContent).toBe('false')
    })

    it('auto-reconnects to persisted wallet on mount', async () => {
      // Setup: Simulate a previously saved connection
      localStorage.setItem(
        'stellar-nebula:wallet',
        JSON.stringify({
          publicKey: 'GFREIGHTER123',
          walletType: 'freighter',
          network: 'testnet',
        })
      )

      renderWithProvider()

      // Should be reconnecting initially
      expect(screen.getByTestId('isReconnecting').textContent).toBe('true')

      // Wait for auto-reconnect to complete (when isReconnecting becomes false)
      await waitFor(() => {
        expect(screen.getByTestId('isReconnecting').textContent).toBe('false')
      })

      expect(screen.getByTestId('connected').textContent).toBe('true')
      expect(screen.getByTestId('pubkey').textContent).toBe('GFREIGHTER123')
    })

    it('persisted wallet triggers reconnection on mount', () => {
      // Setup: Simulate a previously saved connection
      localStorage.setItem(
        'stellar-nebula:wallet',
        JSON.stringify({
          publicKey: 'GFREIGHTER123',
          walletType: 'freighter',
          network: 'testnet',
        })
      )

      renderWithProvider()

      // Should have reconnection in progress
      expect(screen.getByTestId('isReconnecting').textContent).toBe('true')
    })
  })
})
