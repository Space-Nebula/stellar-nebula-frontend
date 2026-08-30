import type { Page, Locator } from '@playwright/test'

export class MarketplacePage {
  readonly page: Page
  readonly heading: Locator
  readonly dexContainer: Locator
  readonly exchangeHeading: Locator
  readonly assetSelect: Locator
  readonly quoteAssetLabel: Locator
  readonly priceDisplay: Locator
  readonly buyTabButton: Locator
  readonly sellTabButton: Locator
  readonly priceInput: Locator
  readonly amountInput: Locator
  readonly maxButton: Locator
  readonly totalDisplay: Locator
  readonly submitButton: Locator
  readonly orderBook: Locator
  readonly tradeHistory: Locator
  readonly chartPlaceholder: Locator
  readonly notification: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /trade modules/i })
    this.dexContainer = page.locator('.bg-space-950')
    this.exchangeHeading = page.getByRole('heading', { name: /stellar exchange/i })
    this.assetSelect = page.locator('select').first()
    this.quoteAssetLabel = page.locator('text=XLM').first()
    this.priceDisplay = page.locator('.text-cosmic-cyan').first()
    this.buyTabButton = page.getByRole('button', { name: /buy /i }).first()
    this.sellTabButton = page.getByRole('button', { name: /sell /i }).first()
    this.priceInput = page.locator('#trade-price-input')
    this.amountInput = page.locator('#trade-amount-input')
    // Fallback if IDs not present
    this.maxButton = page.getByRole('button', { name: /set amount to maximum|max/i })
    this.totalDisplay = page.locator('text=Total').locator('..')
    this.submitButton = page.getByRole('button', { name: /place buy order|place sell order/i })
    this.orderBook = page.locator('text=Order Book').locator('..').first()
    this.tradeHistory = page.locator('text=Trade History').locator('..').first()
    this.chartPlaceholder = page.getByText(/tradingview chart will be rendered/i).locator('..')
    this.notification = page.locator('[class*="bg-green-900"], [class*="bg-red-900"]')
  }

  async goto() {
    await this.page.goto('/marketplace')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForReady() {
    await this.page.getByRole('main').waitFor({ state: 'visible' })
    // Wait for DEX to load (spinner disappears)
    await this.exchangeHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    await this.page.waitForTimeout(800) // allow mock data to populate
  }

  async getCurrentPrice(): Promise<string | null> {
    // Price in chart + in form
    const price = this.page.locator('.text-3xl.font-bold.text-cosmic-cyan')
    if (await price.isVisible().catch(() => false)) {
      return price.textContent()
    }
    return null
  }

  async switchToBuy() {
    if (await this.buyTabButton.isVisible().catch(() => false)) {
      await this.buyTabButton.click()
    }
  }

  async switchToSell() {
    if (await this.sellTabButton.isVisible().catch(() => false)) {
      await this.sellTabButton.click()
    }
  }

  async getActiveTradeType(): Promise<'buy' | 'sell' | null> {
    const buyPressed = await this.buyTabButton.getAttribute('aria-pressed').catch(() => null)
    const sellPressed = await this.sellTabButton.getAttribute('aria-pressed').catch(() => null)
    if (buyPressed === 'true') return 'buy'
    if (sellPressed === 'true') return 'sell'
    // Fallback via class
    const buyClass = await this.buyTabButton.getAttribute('class').catch(() => '')
    if (buyClass.includes('bg-green-600')) return 'buy'
    return null
  }

  async setPrice(value: string) {
    const input = this.priceInput
      .isVisible()
      .then((v) => (v ? this.priceInput : this.page.locator('input[type="number"]').first()))
      .catch(() => this.page.locator('input[type="number"]').first())
    const target = await input
    await target.fill(value)
  }

  async setAmount(value: string) {
    // Prefer amount input by label
    let target: Locator
    if (await this.amountInput.isVisible().catch(() => false)) {
      target = this.amountInput
    } else {
      // Second number input
      const inputs = this.page.locator('input[type="number"]')
      target = inputs.nth(1)
    }
    await target.fill(value)
  }

  async clickMax() {
    await this.maxButton.click()
  }

  async getTotal(): Promise<string | null> {
    const total = this.page.locator('text=Total').locator('..').locator('.font-mono')
    if (await total.isVisible().catch(() => false)) {
      return total.textContent()
    }
    return null
  }

  async submitOrder() {
    await this.submitButton.click()
  }

  async placeBuyOrder(price: string, amount: string) {
    await this.switchToBuy()
    await this.setPrice(price)
    await this.setAmount(amount)
    await this.submitOrder()
  }

  async placeSellOrder(price: string, amount: string) {
    await this.switchToSell()
    await this.setPrice(price)
    await this.setAmount(amount)
    await this.submitOrder()
  }

  async getNotificationText(): Promise<string | null> {
    if (await this.notification.isVisible({ timeout: 3000 }).catch(() => false)) {
      return this.notification.textContent()
    }
    return null
  }

  async selectAsset(assetCode: string) {
    await this.assetSelect.selectOption(assetCode)
    await this.page.waitForTimeout(700) // wait for mock reload
  }

  async getAvailableAssets(): Promise<string[]> {
    const options = this.assetSelect.locator('option')
    const count = await options.count()
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const val = await options.nth(i).getAttribute('value')
      if (val) codes.push(val)
    }
    return codes
  }

  async isOrderBookVisible() {
    return this.page
      .getByText(/order book/i)
      .isVisible()
      .catch(() => false)
  }

  async isTradeHistoryVisible() {
    return this.page
      .getByText(/trade history/i)
      .isVisible()
      .catch(() => false)
  }
}
