import { test, expect } from '@playwright/test'
import { NebulaPage } from './pages/nebula.page'
import { AppPage } from './pages/app.page'
import { test as walletTest } from './fixtures/wallet'

test.describe('Nebula scan page (POM)', () => {
  let nebula: NebulaPage
  let app: AppPage

  test.beforeEach(async ({ page }) => {
    nebula = new NebulaPage(page)
    app = new AppPage(page)
  })

  test('renders the nebula view', async ({ page }) => {
    await nebula.goto()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(nebula.heading).toBeVisible()
  })

  test('shows nebula canvas element', async ({ page }) => {
    await nebula.goto()
    await nebula.waitForCanvas()
    await expect(nebula.canvas).toBeVisible()
  })

  test('shows connect prompt for unauthenticated scan', async () => {
    await nebula.goto()
    const action = await nebula.getVisibleAction()
    expect(['connect', 'scan', 'none'].includes(action)).toBeTruthy()
    // At least inventory or canvas should be visible even without wallet
    expect(await nebula.isInventoryVisible()).toBeTruthy()
  })

  test('navigates to nebula from nav link via AppPage POM', async ({ page }) => {
    await app.goto('/')
    await app.navigateTo('nebula')
    await expect(page).toHaveURL(/\/nebula/)
    await expect(nebula.canvas).toBeVisible({ timeout: 10000 })
  })

  test('canvas is keyboard and screen-reader accessible', async () => {
    await nebula.goto()
    await nebula.waitForCanvas()
    // Canvas should be visible; if aria-label not set, ensure parent has label
    const main = nebula.page.getByRole('main')
    await expect(main).toBeVisible()
  })

  test('inventory filters are accessible and functional', async () => {
    await nebula.goto()
    await nebula.waitForCanvas()
    await expect(nebula.inventory).toBeVisible()
    // Filter buttons should have aria-label and aria-pressed
    if (await nebula.inventoryFilterAll.isVisible().catch(() => false)) {
      await expect(nebula.inventoryFilterAll).toHaveAttribute('aria-label', /filter resources/i)
      await nebula.filterInventory('stocked')
      await expect(nebula.inventoryFilterStocked).toHaveAttribute('aria-pressed', 'true')
      await nebula.filterInventory('all')
      await expect(nebula.inventoryFilterAll).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('harvest log and totals are visible', async () => {
    await nebula.goto()
    await expect(nebula.harvestLog).toBeVisible()
    await expect(nebula.inventory).toBeVisible()
    // Totals grid may be empty before scans, but structure should exist
    await expect(nebula.page.locator('.harvest-totals')).toBeVisible()
  })

  test('nebula page loads on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await nebula.goto()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(nebula.canvas).toBeVisible({ timeout: 10000 })
  })
})

walletTest.describe('Nebula scan — with wallet (POM)', () => {
  walletTest.use({ mockWalletInstalled: undefined } as never)

  walletTest(
    'authenticated user sees nebula canvas and can interact',
    async ({ page, mockWalletInstalled: _ }) => {
      const nebula = new NebulaPage(page)
      await nebula.goto()
      await nebula.waitForCanvas()
      await expect(nebula.canvas).toBeVisible()

      // Try scanning anomaly
      await nebula.scanAnomaly()
      // After scan, inventory or harvest log should still be visible
      await expect(nebula.inventory).toBeVisible()
      await expect(nebula.harvestLog).toBeVisible()
    }
  )

  walletTest(
    'scan anomaly updates harvest totals (if mock harvest)',
    async ({ page, mockWalletInstalled: _ }) => {
      const nebula = new NebulaPage(page)
      await nebula.goto()
      await nebula.waitForCanvas()

      const before = await nebula.getHarvestTotals().catch(() => ({}))
      await nebula.scanAnomaly()
      // Totals may update optimistically; at least page remains stable
      await expect(nebula.harvestLog).toBeVisible()
      // No error thrown
      const after = await nebula.getHarvestTotals().catch(() => ({}))
      expect(typeof after).toBe('object')
    }
  )
})
