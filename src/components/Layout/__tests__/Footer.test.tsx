import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import { WalletProvider } from '../../../contexts/WalletContext'
import Footer from '../Footer'

vi.mock('@services/wallets', () => ({
  isFreighterInstalled: vi.fn().mockResolvedValue(false),
  connectFreighter: vi.fn(),
  getFreighterNetwork: vi.fn(),
  isAlbedoAvailable: vi.fn().mockReturnValue(false),
  connectAlbedo: vi.fn(),
  signTransactionWithFreighter: vi.fn(),
  signTransactionWithAlbedo: vi.fn(),
}))

function renderFooter() {
  return render(
    <WalletProvider>
      <Footer />
    </WalletProvider>
  )
}

describe('Footer', () => {
  it('renders copyright information', () => {
    renderFooter()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByText(/MIT License/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Stellar Nebula/i).length).toBeGreaterThan(0)
  })

  it('renders doc and GitHub links', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: /docs/i })).toHaveAttribute(
      'href',
      'https://github.com/Space-Nebula/stellar-nebula-docs'
    )
    // Two GitHub links exist (text link + icon link) - verify at least one
    expect(screen.getAllByRole('link', { name: /github/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('renders social media links', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: /discord/i })).toBeInTheDocument()
  })

  it('renders network status indicator', () => {
    renderFooter()
    expect(screen.getByLabelText(/network:/i)).toBeInTheDocument()
  })
})
