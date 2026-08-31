import { test, expect } from '@playwright/test'
import { MarketplacePage } from './pages/marketplace.page'
import { AppPage } from './pages/app.page'

test.describe('Marketplace — DEX trading flows', () => {
  let market: MarketplacePage
  let app: AppPage

  test.beforeEach(async ({ page }) => {
    market = new MarketplacePage(page)
    app = new AppPage(page)
    await market.goto()
    await market.waitForReady()
  })

  test('renders marketplace and stellar exchange', async () => {
    await expect(market.heading).toBeVisible()
    await expect(market.exchangeHeading).toBeVisible()
    await expect(market.dexContainer).toBeVisible()
  })

  test('shows chart placeholder and current price', async () => {
    await expect(market.chartPlaceholder).toBeVisible()
    const price = await market.getCurrentPrice()
    expect(price).toBeTruthy()
    expect(price).toMatch(/\d+\.\d+/)
  })

  test('displays order book and trade history after loading', async () => {
    await expect.poll(async () => market.isOrderBookVisible(), { timeout: 8000 }).toBe(true)
    await expect.poll(async () => market.isTradeHistoryVisible(), { timeout: 8000 }).toBe(true)
  })

  test('buy/sell toggle switches trade type (POM)', async () => {
    await market.switchToBuy()
    expect(await market.getActiveTradeType()).toBe('buy')
    await expect(market.submitButton).toContainText(/buy/i)

    await market.switchToSell()
    expect(await market.getActiveTradeType()).toBe('sell')
    await expect(market.submitButton).toContainText(/sell/i)
  })

  test('buy form validates and shows total calculation', async () => {
    await market.switchToBuy()
    await market.setPrice('0.05')
    await market.setAmount('100')
    const total = await market.getTotal()
    expect(total).toContain('XLM')
    // 0.05 * 100 = 5.0000
    expect(total).toMatch(/5\.0+/)
  })

  test('MAX button fills amount with 100', async () => {
    await market.switchToBuy()
    await market.clickMax()
    // amount input should now be 100
    const amountVal = await market.amountInput.inputValue().catch(async () => {
      const inputs = market.page.locator('input[type="number"]')
      return inputs.nth(1).inputValue()
    })
    expect(amountVal).toBe('100')
  })

  test('places a buy order and shows success notification', async () => {
    await market.placeBuyOrder('0.0542', '50')
    const notif = await market.getNotificationText()
    expect(notif).toMatch(/placed buy order/i)
    expect(notif).toContain('50')
  })

  test('places a sell order and shows success notification', async () => {
    await market.placeSellOrder('0.0600', '25')
    const notif = await market.getNotificationText()
    expect(notif).toMatch(/placed sell order/i)
    expect(notif).toContain('25')
  })

  test('asset selector switches market (DUST / CRYS / DARK)', async () => {
    const assets = await market.getAvailableAssets()
    expect(assets.length).toBeGreaterThanOrEqual(2)
    // Try switching to each
    for (const code of assets.slice(0, 2)) {
      await market.selectAsset(code)
      const heading = market.page.getByText(new RegExp(`${code} / XLM`, 'i'))
      await expect(heading.first()).toBeVisible({ timeout: 8000 })
    }
  })

  test('navigates to marketplace via AppPage POM', async ({ page }) => {
    await page.goto('/')
    await app.navigateTo('market')
    await expect(page).toHaveURL(/\/marketplace/)
    await expect(market.exchangeHeading).toBeVisible()
  })

  test('trade form inputs have accessible labels (a11y)', async () => {
    const priceLabel = market.page.getByLabel(/price in/i)
    const amountLabel = market.page.getByLabel(/amount of/i)
    // Inputs should be accessible via label or aria-label
    await expect(priceLabel.or(market.priceInput)).toBeVisible()
    await expect(amountLabel.or(market.amountInput)).toBeVisible()

    // Buttons must have aria-labels
    await expect(market.buyTabButton).toHaveAttribute('aria-label', /buy/i)
    await expect(market.sellTabButton).toHaveAttribute('aria-label', /sell/i)
    await expect(market.maxButton).toHaveAttribute('aria-label', /maximum/i)
  })

  test('marketplace is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await market.goto()
    await market.waitForReady()
    await expect(market.heading).toBeVisible()
    await expect(market.exchangeHeading).toBeVisible()
  })
})
