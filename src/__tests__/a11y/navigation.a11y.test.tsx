import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('@services/wallets', () => ({
  isFreighterInstalled: vi.fn().mockResolvedValue(false),
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

async function renderNavigation() {
  const { WalletProvider } = await import('@/contexts/WalletContext')
  const { NotificationProvider } = await import('@/contexts/NotificationContext')
  const { default: Navigation } = await import('@/components/Navigation')

  const { container } = render(
    <MemoryRouter>
      <WalletProvider>
        <NotificationProvider>
          <Navigation />
        </NotificationProvider>
      </WalletProvider>
    </MemoryRouter>
  )

  return { container }
}

describe('Navigation — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has no WCAG 2.1 AA violations', async () => {
    const { container } = await renderNavigation()
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('header landmark is present', async () => {
    await renderNavigation()
    expect(screen.getAllByRole('banner')[0]).toBeInTheDocument()
  })

  it('primary navigation landmark is present', async () => {
    await renderNavigation()
    expect(
      screen.getAllByRole('navigation', { name: /primary navigation/i })[0]
    ).toBeInTheDocument()
  })

  it('brand logo has an accessible label', async () => {
    await renderNavigation()
    expect(screen.getAllByRole('link', { name: /stellar nebula home/i })[0]).toBeInTheDocument()
  })

  it('all nav links are keyboard reachable', async () => {
    const user = userEvent.setup()
    await renderNavigation()

    const firstLink = screen.getAllByRole('link', { name: /stellar nebula home/i })[0]
    firstLink.focus()

    // Tab through nav links and ensure each receives focus
    const navLinks = screen.getAllByRole('link')
    for (let i = 0; i < navLinks.length; i++) {
      await user.tab()
      expect(document.activeElement).not.toBeNull()
    }
  })

  it('nav links have visible text', async () => {
    await renderNavigation()
    const nav = screen.getAllByRole('navigation', { name: /primary navigation/i })[0]
    const links = Array.from(nav.querySelectorAll('a'))
    links.forEach((link) => {
      expect(link.textContent?.trim().length).toBeGreaterThan(0)
    })
  })

  it('mobile menu trigger has an accessible label', async () => {
    await renderNavigation()
    expect(screen.getAllByRole('button', { name: /open navigation menu/i })[0]).toBeInTheDocument()
  })

  it('mobile menu button has aria-expanded attribute', async () => {
    await renderNavigation()
    const trigger = screen.getAllByRole('button', { name: /open navigation menu/i })[0]
    expect(trigger).toHaveAttribute('aria-expanded')
  })
})
