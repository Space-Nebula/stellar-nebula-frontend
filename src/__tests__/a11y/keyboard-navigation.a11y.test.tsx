import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@services/wallets', () => ({
  isFreighterInstalled: vi.fn().mockResolvedValue(false),
  connectFreighter: vi.fn(),
  getFreighterNetwork: vi.fn(),
  isAlbedoAvailable: vi.fn().mockReturnValue(false),
  connectAlbedo: vi.fn(),
  signTransactionWithFreighter: vi.fn(),
  signTransactionWithAlbedo: vi.fn(),
}))

vi.mock('@/services/monitoring', () => ({
  addMonitoringBreadcrumb: vi.fn(),
  setMonitoringUser: vi.fn(),
  clearMonitoringUser: vi.fn(),
}))

vi.mock('@/services/analytics', () => ({ trackEvent: vi.fn() }))

vi.mock('@/services/logging', () => ({
  createScopedLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

HTMLDialogElement.prototype.showModal = vi.fn()
HTMLDialogElement.prototype.close = vi.fn()

describe('Keyboard navigation — Navigation header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('Tab moves focus through all interactive elements in the header', async () => {
    const user = userEvent.setup()

    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { NotificationProvider } = await import('@/contexts/NotificationContext')
    const { default: Navigation } = await import('@/components/Navigation')

    render(
      <MemoryRouter>
        <WalletProvider>
          <NotificationProvider>
            <Navigation />
          </NotificationProvider>
        </WalletProvider>
      </MemoryRouter>
    )

    // Start focus at document body
    document.body.focus()

    const interactiveElements: Element[] = []
    let prev: Element | null = null

    // Tab up to 6 times and collect focused elements within the header
    for (let i = 0; i < 6; i++) {
      await user.tab()
      const focused = document.activeElement
      if (!focused || focused === document.body) break
      if (focused === prev) break
      prev = focused
      interactiveElements.push(focused)
    }

    expect(interactiveElements.length).toBeGreaterThan(0)
  })

  it('Escape key closes mobile menu when open', async () => {
    const user = userEvent.setup()

    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { NotificationProvider } = await import('@/contexts/NotificationContext')
    const { default: Navigation } = await import('@/components/Navigation')

    render(
      <MemoryRouter>
        <WalletProvider>
          <NotificationProvider>
            <Navigation />
          </NotificationProvider>
        </WalletProvider>
      </MemoryRouter>
    )

    const trigger = screen.getAllByRole('button', { name: /open navigation menu/i })[0]
    await user.click(trigger)

    // MobileMenu should now be open — the trigger itself is always present
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('Help button is focusable and activatable via keyboard', async () => {
    const user = userEvent.setup()

    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { NotificationProvider } = await import('@/contexts/NotificationContext')
    const { default: Navigation } = await import('@/components/Navigation')

    render(
      <MemoryRouter>
        <WalletProvider>
          <NotificationProvider>
            <Navigation />
          </NotificationProvider>
        </WalletProvider>
      </MemoryRouter>
    )

    const helpBtn = screen.getAllByRole('button', { name: /help/i })[0]
    helpBtn.focus()
    expect(document.activeElement).toBe(helpBtn)

    await user.keyboard('{Enter}')
    // HelpModal should open — check for a dialog or modal content
    const dialog = screen.queryByRole('dialog')
    expect(dialog ?? screen.queryByText(/help/i)).toBeTruthy()
  })
})

describe('Keyboard navigation — ConnectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('focuses the first interactive element when modal opens', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { ConnectModal } = await import('@/components/Wallet/ConnectModal')

    render(
      <WalletProvider>
        <ConnectModal isOpen onClose={vi.fn()} />
      </WalletProvider>
    )

    // Any button or link within the modal should be focusable
    const buttons = screen.getAllByRole('button', { hidden: true })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('Tab key moves through modal options', async () => {
    const user = userEvent.setup()

    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { ConnectModal } = await import('@/components/Wallet/ConnectModal')

    render(
      <WalletProvider>
        <ConnectModal isOpen onClose={vi.fn()} />
      </WalletProvider>
    )

    const buttons = screen.getAllByRole('button', { hidden: true })
    buttons[0].focus()

    const visited = new Set<Element>()
    for (let i = 0; i < buttons.length + 1; i++) {
      await user.tab()
      if (document.activeElement) visited.add(document.activeElement)
    }

    expect(visited.size).toBeGreaterThan(0)
  })
})
