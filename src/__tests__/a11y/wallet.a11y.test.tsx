import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

HTMLDialogElement.prototype.showModal = vi.fn()
HTMLDialogElement.prototype.close = vi.fn()

vi.mock('@services/wallets', () => ({
  isFreighterInstalled: vi.fn().mockResolvedValue(true),
  connectFreighter: vi.fn().mockResolvedValue('GFREIGHTER123'),
  getFreighterNetwork: vi.fn().mockResolvedValue('testnet'),
  isAlbedoAvailable: vi.fn().mockReturnValue(true),
  connectAlbedo: vi.fn().mockResolvedValue('GALBEDO123'),
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

describe('ConnectModal — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('has no WCAG 2.1 AA violations when open', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { ConnectModal } = await import('@/components/Wallet/ConnectModal')

    const { container } = render(
      <WalletProvider>
        <ConnectModal isOpen onClose={vi.fn()} />
      </WalletProvider>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('wallet option buttons have accessible names', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { ConnectModal } = await import('@/components/Wallet/ConnectModal')

    render(
      <WalletProvider>
        <ConnectModal isOpen onClose={vi.fn()} />
      </WalletProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Freighter')).toBeInTheDocument()
    })

    const freighterBtn = screen.getByText('Freighter').closest('button')
    expect(freighterBtn).not.toBeNull()
    // Button text itself is the accessible name
    expect(freighterBtn?.textContent?.trim().length).toBeGreaterThan(0)
  })

  it('close button is keyboard accessible', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { ConnectModal } = await import('@/components/Wallet/ConnectModal')

    render(
      <WalletProvider>
        <ConnectModal isOpen onClose={onClose} />
      </WalletProvider>
    )

    const closeBtn = screen.getByRole('button', { name: /close modal/i, hidden: true })
    closeBtn.focus()
    await user.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('StatusIndicator — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('has no WCAG 2.1 AA violations when disconnected', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { StatusIndicator } = await import('@/components/Wallet/StatusIndicator')

    const { container } = render(
      <WalletProvider>
        <StatusIndicator onOpenConnectModal={vi.fn()} />
      </WalletProvider>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('status button has an aria-label describing current state', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { StatusIndicator } = await import('@/components/Wallet/StatusIndicator')

    render(
      <WalletProvider>
        <StatusIndicator onOpenConnectModal={vi.fn()} />
      </WalletProvider>
    )

    const btn = screen.getByRole('button', { name: /wallet status/i })
    expect(btn).toHaveAttribute('aria-label')
    expect(btn.getAttribute('aria-label')).toMatch(/disconnected|connected|connecting/i)
  })
})
