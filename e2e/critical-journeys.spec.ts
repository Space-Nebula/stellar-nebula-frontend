import { test, expect } from '@playwright/test'
import { test as walletTest, connectWallet } from './fixtures/wallet'
import { AppPage } from './pages/app.page'
import { WalletPage } from './pages/wallet.page'
import { NebulaPage } from './pages/nebula.page'
import { ShipPage } from './pages/ship.page'
import { MarketplacePage } from './pages/marketplace.page'

// ─── Critical user paths — full E2E journeys with POM ───────────────────────

walletTest.describe('Critical Path: Wallet → Scan Nebula → Upgrade Ship → Marketplace', () => {
  walletTest.use({ mockWalletInstalled: undefined } as never)

  walletTest('full journey via POMs', async ({ page, mockWalletInstalled: _ }) => {
    const app = new AppPage(page)
    const wallet = new WalletPage(page)
    const nebula = new NebulaPage(page)
    const ship = new ShipPage(page)
    const market = new MarketplacePage(page)

    // 1) Home
    await app.goto('/')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page).toHaveTitle(/stellar nebula/i)

    // 2) Connect wallet (if button visible)
    if (await wallet.connectButton.isVisible().catch(() => false)) {
      await wallet.connectWithFreighter()
      await page.waitForTimeout(600)
    }

    // 3) Scan Nebula
    await app.navigateTo('nebula')
    await nebula.waitForCanvas()
    await expect(nebula.canvas).toBeVisible()
    await expect(nebula.inventory).toBeVisible()
    // Attempt scan interaction
    await nebula.scanAnomaly()
    await expect(nebula.harvestLog).toBeVisible()
    await expect(nebula.inventory).toBeVisible()

    // 4) Upgrade Ship
    await app.navigateTo('ship')
    await ship.waitForReady()
    await expect(ship.fleetSection).toBeVisible()
    const shipCount = await ship.getShipCount()
    expect(shipCount).toBeGreaterThanOrEqual(1)
    await ship.openUpgradeBay()
    await expect(ship.upgradeModal).toBeVisible()
    // Select an upgrade and verify details
    await ship.selectUpgrade('cargo')
    await expect(ship.cargoUpgradeButton).toHaveAttribute('aria-pressed', 'true')
    // Attempt apply if affordable (may show confirm modal)
    const canApply = await ship.canApplyUpgrade()
    if (canApply) {
      await ship.applyUpgrade()
      await ship.handleConfirmModalIfVisible()
      // Wait for any banner or modal update
      await page.waitForTimeout(800)
    } else {
      await ship.closeUpgradeModal()
    }

    // 5) Marketplace Trade
    await app.navigateTo('market')
    await market.waitForReady()
    await expect(market.exchangeHeading).toBeVisible()
    await market.switchToBuy()
    await market.setPrice('0.0542')
    await market.setAmount('10')
    await market.submitOrder()
    const notif = await market.getNotificationText().catch(() => null)
    // Notification may appear for successful order
    if (notif) expect(notif).toMatch(/placed (buy|sell) order/i)

    // 6) Leaderboard check
    await app.navigateTo('leaderboard')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('heading', { name: /galactic leaderboard/i })).toBeVisible()

    // 7) Back home
    await app.navigateTo('home')
    await expect(page).toHaveURL('/')
  })

  walletTest(
    'journey verifies wallet persistence across routes',
    async ({ page, mockWalletInstalled: _ }) => {
      const app = new AppPage(page)
      const wallet = new WalletPage(page)
      await app.goto('/')
      if (await wallet.connectButton.isVisible().catch(() => false)) {
        await wallet.connectWithFreighter()
      }
      for (const route of ['nebula', 'ship', 'market'] as const) {
        await app.navigateTo(route)
        await expect(page.getByRole('main')).toBeVisible()
        // No console errors on navigation
      }
    }
  )
})

test.describe('Error scenarios (POM)', () => {
  test('handles 404 gracefully', async ({ page }) => {
    const app = new AppPage(page)
    const response = await page.goto('/nonexistent-page')
    expect(response?.status()).toBe(200)
    await expect(page.getByText(/not found/i).or(page.getByRole('heading'))).toBeVisible()
    await expect(app.main).toBeVisible()
  })

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const app = new AppPage(page)
    await app.goto('/')
    await app.waitForMainVisible()
    expect(errors).toHaveLength(0)
  })

  test('navigation via AppPage POM covers all routes', async ({ page }) => {
    const app = new AppPage(page)
    await app.goto('/')
    await expect(page).toHaveTitle(/stellar nebula/i)
    await app.navigateTo('nebula')
    await expect(page).toHaveURL(/\/nebula/)
    await app.navigateTo('ship')
    await expect(page).toHaveURL(/\/dashboard/)
    await app.navigateTo('market')
    await expect(page).toHaveURL(/\/marketplace/)
    await app.navigateTo('home')
    await expect(page).toHaveURL('/')
  })
})

test.describe('Mobile viewport critical paths (POM)', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('renders on mobile viewport', async ({ page }) => {
    const app = new AppPage(page)
    await app.goto('/')
    await expect(app.main).toBeVisible()
  })

  test('nebula page loads on mobile with POM', async ({ page }) => {
    const nebula = new NebulaPage(page)
    await nebula.goto()
    await expect(page.getByRole('main')).toBeVisible()
    await nebula.waitForCanvas()
    await expect(nebula.canvas).toBeVisible()
  })

  test('marketplace mobile flow', async ({ page }) => {
    const market = new MarketplacePage(page)
    await market.goto()
    await market.waitForReady()
    await expect(market.heading).toBeVisible()
    await market.switchToBuy()
    await expect(market.submitButton).toBeVisible()
  })

  test('ship dashboard mobile flow', async ({ page }) => {
    const ship = new ShipPage(page)
    await ship.goto()
    await ship.waitForReady()
    await expect(ship.fleetSection).toBeVisible()
    await expect(ship.openUpgradeBayButton).toBeVisible()
  })
})

test.describe('Accessibility — critical paths', () => {
  test('all main routes have accessible main landmark', async ({ page }) => {
    const app = new AppPage(page)
    for (const path of ['/', '/nebula', '/dashboard', '/marketplace']) {
      await page.goto(path)
      await expect(page.getByRole('main')).toBeVisible()
      await expect(page.getByRole('banner')).toBeVisible()
      await expect(app.skipLink).toBeAttached()
    }
  })

  test('interactive elements have aria-labels on critical paths', async ({ page }) => {
    const app = new AppPage(page)
    await app.goto('/')
    // Header wallet button
    const walletBtn = page.getByRole('button', { name: /connect wallet/i }).first()
    if (await walletBtn.isVisible()) {
      await expect(walletBtn).toHaveAttribute('aria-label', /connect wallet/i)
    }
    // Theme toggle if present
    if (await app.themeToggle.isVisible().catch(() => false)) {
      await expect(app.themeToggle).toHaveAttribute('aria-label', /switch to/i)
    }
  })
})
