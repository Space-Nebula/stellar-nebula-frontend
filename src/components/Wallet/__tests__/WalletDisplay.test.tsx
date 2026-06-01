import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import { WalletProvider } from '@/contexts/WalletContext'
import { WalletDisplay } from '../WalletDisplay'

// Must be a plain string literal — vi.mock is hoisted and cannot close over variables
vi.mock('@services/wallets', () => ({
  isFreighterInstalled: vi.fn().mockResolvedValue(true),
  connectFreighter: vi
    .fn()
    .mockResolvedValue('GABCDE1234567890KLMNOPQRSTUVWXYZ1234567890ABCDE123456'),
  getFreighterNetwork: vi.fn().mockResolvedValue('testnet'),
  isAlbedoAvailable: vi.fn().mockReturnValue(true),
  connectAlbedo: vi.fn(),
  signTransactionWithFreighter: vi.fn(),
  signTransactionWithAlbedo: vi.fn(),
}))

vi.mock('@utils/stellar/balance', () => ({
  useAccountBalances: vi.fn().mockReturnValue({
    balances: [{ assetCode: 'XLM', balance: '100.5000000', isNative: true }],
    isLoading: false,
    error: null,
    isUnfunded: false,
    refresh: vi.fn(),
  }),
}))

const TEST_PUBKEY = 'GABCDE1234567890KLMNOPQRSTUVWXYZ1234567890ABCDE123456'

function renderWithPersistedWallet() {
  localStorage.setItem(
    'stellar-nebula:wallet',
    JSON.stringify({ publicKey: TEST_PUBKEY, walletType: 'freighter', network: 'testnet' })
  )
  return render(
    <WalletProvider>
      <WalletDisplay onOpenConnectModal={vi.fn()} />
    </WalletProvider>
  )
}

async function waitForConnectedWalletUI() {
  await screen.findByRole('button', { name: /disconnect wallet/i })
}

function renderDisconnected(onOpen = vi.fn()) {
  return render(
    <WalletProvider>
      <WalletDisplay onOpenConnectModal={onOpen} />
    </WalletProvider>
  )
}

describe('WalletDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders a connect button when disconnected', () => {
    renderDisconnected()
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('calls onOpenConnectModal when connect button is clicked', async () => {
    const onOpen = vi.fn()
    renderDisconnected(onOpen)
    await userEvent.click(screen.getByRole('button', { name: /connect wallet/i }))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('shows truncated address when connected via persisted state', async () => {
    renderWithPersistedWallet()
    await waitForConnectedWalletUI()
    expect(screen.getByText(/GABCDE/)).toBeInTheDocument()
  })

  it('shows XLM balance when connected', async () => {
    renderWithPersistedWallet()
    await waitForConnectedWalletUI()
    expect(screen.getByText(/100\.50/)).toBeInTheDocument()
  })

  it('has a disconnect button when connected', async () => {
    renderWithPersistedWallet()
    await waitForConnectedWalletUI()
    expect(screen.getByRole('button', { name: /disconnect wallet/i })).toBeInTheDocument()
  })

  it('copies address to clipboard when address button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    renderWithPersistedWallet()
    await waitForConnectedWalletUI()

    const copyBtn = screen.getByRole('button', { name: /copy full address/i })
    await userEvent.click(copyBtn)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(TEST_PUBKEY)
    })
  })
})
