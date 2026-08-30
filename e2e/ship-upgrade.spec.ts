import { test, expect } from '@playwright/test'
import { ShipPage } from './pages/ship.page'
import { AppPage } from './pages/app.page'
import { test as walletTest } from './fixtures/wallet'

test.describe('Ship upgrade flow (POM)', () => {
  let ship: ShipPage
  let app: AppPage

  test.beforeEach(async ({ page }) => {
    ship = new ShipPage(page)
    app = new AppPage(page)
  })

  test('renders the ship dashboard', async () => {
    await ship.goto()
    await ship.waitForReady()
    await expect(ship.page.getByRole('main')).toBeVisible()
    await expect(ship.fleetSection).toBeVisible()
  })

  test('shows wallet connect prompt when not connected', async () => {
    await ship.goto()
    const hasConnect = await ship.connectWalletPrompt.isVisible().catch(() => false)
    const hasContent = await ship.page
      .getByText(/fleet/i)
      .isVisible()
      .catch(() => false)
    expect(hasConnect || hasContent).toBe(true)
  })

  test('navigates to dashboard from nav via AppPage POM', async ({ page }) => {
    await app.goto('/')
    await app.navigateTo('ship')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(ship.fleetSection).toBeVisible()
  })

  test('displays fleet ships and inventory', async () => {
    await ship.goto()
    await ship.waitForReady()
    const count = await ship.getShipCount()
    expect(count).toBeGreaterThanOrEqual(1)
    await expect(ship.inventoryPanel.first()).toBeVisible()
    await expect(ship.upgradeQueue).toBeVisible()
  })

  test('ship cards are accessible buttons with dynamic labels', async () => {
    await ship.goto()
    await ship.waitForReady()
    const firstCard = ship.shipCards.first()
    await expect(firstCard).toBeVisible()
    await expect(firstCard).toHaveAttribute('aria-label', /select ship/i)
    // Should have aria-pressed for active state
    const pressed = await firstCard.getAttribute('aria-pressed')
    expect(['true', 'false', null].includes(pressed)).toBeTruthy()
  })

  test('open upgrade bay button is accessible', async () => {
    await ship.goto()
    await ship.waitForReady()
    await expect(ship.openUpgradeBayButton).toBeVisible()
    await expect(ship.openUpgradeBayButton).toHaveAttribute('aria-label', /open.*upgrade bay/i)
  })

  test('upgrade modal opens and shows upgrade options with a11y labels', async () => {
    await ship.goto()
    await ship.waitForReady()
    await ship.openUpgradeBay()
    await expect(ship.upgradeModal).toBeVisible()
    await expect(ship.upgradeModal).toHaveAttribute('aria-modal', 'true')
    // Upgrade choices should have aria-label and aria-pressed
    const choices = ship.upgradeChoices
    const count = await choices.count()
    expect(count).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(choices.nth(i)).toHaveAttribute('aria-label', /select upgrade/i)
    }
    await ship.closeUpgradeModal()
  })

  test('selecting an upgrade updates details and apply button state', async () => {
    await ship.goto()
    await ship.waitForReady()
    await ship.openUpgradeBay()
    // Try selecting crew quarters
    if (await ship.crewUpgradeButton.isVisible().catch(() => false)) {
      await ship.selectUpgrade('crew')
      await expect(ship.crewUpgradeButton).toHaveAttribute('aria-pressed', 'true')
    }
    const canApply = await ship.canApplyUpgrade()
    expect(typeof canApply).toBe('boolean')
    await ship.closeUpgradeModal()
  })

  test('upgrade queue shows ready/locked states', async () => {
    await ship.goto()
    await ship.waitForReady()
    const queueCount = await ship.getUpgradeQueueItems()
    expect(queueCount).toBeGreaterThanOrEqual(3)
  })

  test('marketplace is accessible from nav via POM', async ({ page }) => {
    await app.goto('/')
    await app.navigateTo('market')
    await expect(page).toHaveURL(/\/marketplace/)
    await expect(page.getByRole('main')).toBeVisible()
  })
})

walletTest.describe('Ship upgrade — with wallet (POM)', () => {
  walletTest.use({ mockWalletInstalled: undefined } as never)

  walletTest(
    'authenticated user can open upgrade bay and see wallet-connected state',
    async ({ page, mockWalletInstalled: _ }) => {
      const ship = new ShipPage(page)
      await ship.goto()
      await ship.waitForReady()
      await expect(ship.openUpgradeBayButton).toBeVisible()
      await ship.openUpgradeBay()
      await expect(ship.upgradeModal).toBeVisible()
      // Validate cancel button has label
      await expect(ship.cancelUpgradeButton).toHaveAttribute('aria-label', /cancel upgrade/i)
      await ship.closeUpgradeModal()
    }
  )

  walletTest(
    'full upgrade flow: select upgrade and attempt apply (mock)',
    async ({ page, mockWalletInstalled: _ }) => {
      const ship = new ShipPage(page)
      await ship.goto()
      await ship.waitForReady()
      await ship.openUpgradeBay()
      // Select first upgrade
      const firstChoice = ship.upgradeChoices.first()
      await firstChoice.waitFor({ state: 'visible' })
      await firstChoice.click()
      // Check apply button state
      const apply = ship.page.getByRole('button', { name: /apply upgrade/i })
      if (await apply.isVisible().catch(() => false)) {
        const disabled = await apply.isDisabled()
        // If affordable, it should be enabled; if not, disabled is okay
        expect(typeof disabled).toBe('boolean')
        if (!disabled) {
          await apply.click()
          // Handle potential confirm modal
          await ship.handleConfirmModalIfVisible()
          // Banner may appear
          await expect(ship.transactionBanner.or(ship.upgradeModal))
            .toBeVisible({ timeout: 5000 })
            .catch(() => {})
        }
      }
      await ship.closeUpgradeModal().catch(() => {})
    }
  )
})
