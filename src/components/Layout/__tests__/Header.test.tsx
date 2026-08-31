import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../../test/utils'
import { MemoryRouter } from 'react-router-dom'
import { WalletProvider } from '../../../contexts/WalletContext'
import Header from '../Header'

vi.mock('@services/wallets', () => ({
  isFreighterInstalled: vi.fn().mockResolvedValue(false),
  isLedgerAvailable: vi.fn().mockResolvedValue(false),
  connectLedger: vi.fn(),
  signTransactionWithLedger: vi.fn(),
  disconnectLedger: vi.fn(),
  getLedgerNetwork: vi.fn((network: string) => network),
  isWalletConnectAvailable: vi.fn().mockReturnValue(false),
  connectWalletConnect: vi.fn(),
  signTransactionWithWalletConnect: vi.fn(),
  getWalletConnectNetwork: vi.fn(),
  disconnectWalletConnect: vi.fn(),
  loadWalletConnectSession: vi.fn().mockReturnValue(null),
  connectFreighter: vi.fn(),
  getFreighterNetwork: vi.fn(),
  isAlbedoAvailable: vi.fn().mockReturnValue(false),
  connectAlbedo: vi.fn(),
  signTransactionWithFreighter: vi.fn(),
  signTransactionWithAlbedo: vi.fn(),
}))

function renderHeader(onOpenConnectModal?: () => void) {
  return render(
    <MemoryRouter>
      <WalletProvider>
        <Header onOpenConnectModal={onOpenConnectModal} />
      </WalletProvider>
    </MemoryRouter>
  )
}

describe('Header', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders logo and brand', () => {
    renderHeader()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /stellar nebula home/i })).toBeInTheDocument()
  })

  it('renders all navigation links', () => {
    renderHeader()
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nebula' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ship' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Market' })).toBeInTheDocument()
  })

  it('renders connect wallet button when disconnected', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('calls onOpenConnectModal when connect button clicked', () => {
    const onOpen = vi.fn()
    renderHeader(onOpen)
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('renders hamburger menu button', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })

  it('opens and closes mobile menu', () => {
    renderHeader()
    const hamburger = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(hamburger)
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument()
  })
})
