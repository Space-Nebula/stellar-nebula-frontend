import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('@/services/monitoring', () => ({
  addMonitoringBreadcrumb: vi.fn(),
  setMonitoringUser: vi.fn(),
  clearMonitoringUser: vi.fn(),
}))

vi.mock('@/services/analytics', () => ({ trackEvent: vi.fn() }))

vi.mock('@/services/errorTracking', () => ({
  captureError: vi.fn(),
}))

vi.mock('@/services/logging', () => ({
  createScopedLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/services/wallets', () => ({
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

HTMLDialogElement.prototype.showModal = vi.fn()
HTMLDialogElement.prototype.close = vi.fn()

// ── ThemeToggle ──────────────────────────────────────────────────────────────

describe('ThemeToggle — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has no WCAG 2.1 AA violations', async () => {
    const { ThemeToggle } = await import('@/components/ThemeToggle')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')

    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('button has an accessible label', async () => {
    const { ThemeToggle } = await import('@/components/ThemeToggle')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const btn = screen.getByRole('button', { name: /switch to (light|dark) mode/i })
    expect(btn).toBeInTheDocument()
  })

  it('button is keyboard activatable', async () => {
    const user = userEvent.setup()
    const { ThemeToggle } = await import('@/components/ThemeToggle')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const btn = screen.getByRole('button', { name: /switch to (light|dark) mode/i })
    btn.focus()
    expect(document.activeElement).toBe(btn)

    await user.keyboard('{Enter}')
    // Button should still be present and functional
    expect(btn).toBeInTheDocument()
  })

  it('icon SVGs have no implicit accessible name issues', async () => {
    const { ThemeToggle } = await import('@/components/ThemeToggle')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')

    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // SVGs should either be hidden from AT or have a label
    const svgs = container.querySelectorAll('svg')
    for (const svg of svgs) {
      const hidden = svg.getAttribute('aria-hidden')
      const label = svg.getAttribute('aria-label')
      const role = svg.getAttribute('role')
      // SVG is decorative (hidden) or has a label/role — either is fine
      expect(hidden === 'true' || label || role === 'img').toBeTruthy()
    }
  })
})

// ── ErrorBoundary ────────────────────────────────────────────────────────────

describe('ErrorBoundary — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('error fallback has no WCAG 2.1 AA violations', async () => {
    const { default: ErrorBoundary } = await import('@/components/ErrorBoundary')

    const ThrowingChild = () => {
      throw new Error('Test error for a11y')
    }

    // Suppress console.error from the error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()

    spy.mockRestore()
  })

  it('error state has role="alert"', async () => {
    const { default: ErrorBoundary } = await import('@/components/ErrorBoundary')

    const ThrowingChild = () => {
      throw new Error('Test error')
    }

    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('Try Again button is keyboard accessible', async () => {
    const user = userEvent.setup()
    const { default: ErrorBoundary } = await import('@/components/ErrorBoundary')

    const ThrowingChild = () => {
      throw new Error('Test error')
    }

    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i })
    tryAgainBtn.focus()
    expect(document.activeElement).toBe(tryAgainBtn)

    await user.keyboard('{Enter}')
    // After reset, the boundary should try to render children again — fallback reappears (new element)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('custom fallback has no WCAG violations', async () => {
    const { default: ErrorBoundary } = await import('@/components/ErrorBoundary')

    const ThrowingChild = () => {
      throw new Error('Test error')
    }

    vi.spyOn(console, 'error').mockImplementation(() => {})

    const customFallback = (
      <div role="status">
        <p>Something went wrong — custom fallback</p>
        <button type="button">Retry</button>
      </div>
    )

    const { container } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingChild />
      </ErrorBoundary>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

// ── Spinner (UI component) ──────────────────────────────────────────────────

describe('Spinner — accessibility', () => {
  it('has no WCAG 2.1 AA violations', async () => {
    const { Spinner } = await import('@/components/UI/Spinner')

    const { container } = render(<Spinner />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

// ── Generic interactive elements across the app ─────────────────────────────

describe('All buttons — keyboard accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('ThemeToggle and ErrorBoundary reset button are focusable', async () => {
    const user = userEvent.setup()
    const { ThemeToggle } = await import('@/components/ThemeToggle')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')
    const { default: ErrorBoundary } = await import('@/components/ErrorBoundary')

    vi.spyOn(console, 'error').mockImplementation(() => {})

    const ThrowingChild = () => {
      throw new Error('focus test')
    }

    render(
      <ThemeProvider>
        <ThemeToggle />
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      </ThemeProvider>
    )

    // ThemeToggle button should be focusable
    const themeBtn = screen.getByRole('button', { name: /switch to (light|dark) mode/i })
    themeBtn.focus()
    expect(document.activeElement).toBe(themeBtn)

    // Tab to next focusable element (Try Again button)
    await user.tab()
    expect(document.activeElement).not.toBe(themeBtn)
    expect(document.activeElement).not.toBe(document.body)
  })
})

// ── Screen reader compatibility ─────────────────────────────────────────────

describe('Screen reader compatibility', () => {
  it('ThemeToggle icon is decorative (aria-hidden)', async () => {
    const { ThemeToggle } = await import('@/components/ThemeToggle')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')

    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // Decorative SVG should be hidden from screen readers
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
  })

  it('ErrorBoundary error message is exposed to AT', async () => {
    const { default: ErrorBoundary } = await import('@/components/ErrorBoundary')

    const ThrowingChild = () => {
      throw new Error('Screen reader test error')
    }

    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    // Error message should be visible in the DOM (not hidden from AT)
    const errorMsg = screen.getByText(/Screen reader test error/)
    expect(errorMsg).toBeInTheDocument()
    expect(errorMsg).not.toHaveAttribute('aria-hidden', 'true')
  })
})

// ── Color contrast (structural checks) ──────────────────────────────────────

describe('Color contrast — structural checks', () => {
  it('ErrorBoundary fallback uses inline styles with sufficient contrast', async () => {
    const { default: ErrorBoundary } = await import('@/components/ErrorBoundary')

    const ThrowingChild = () => {
      throw new Error('contrast test')
    }

    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    // Check the main error container has a dark background
    const alert = container.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    const bgColor = alert!.getAttribute('style')
    expect(bgColor).toContain('#242424')
  })
})
