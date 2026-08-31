import type { Page, Locator } from '@playwright/test'

export class NebulaPage {
  readonly page: Page
  readonly heading: Locator
  readonly canvas: Locator
  readonly connectPrompt: Locator
  readonly scanButton: Locator
  readonly walletDisplay: Locator
  readonly harvestPanel: Locator
  readonly latestReward: Locator
  readonly inventory: Locator
  readonly harvestLog: Locator
  readonly inventoryFilterAll: Locator
  readonly inventoryFilterStocked: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /survey active stellar/i })
    this.canvas = page.locator('canvas').first()
    this.connectPrompt = page.getByRole('button', { name: /connect wallet/i })
    this.scanButton = page.getByRole('button', { name: /scan nebula/i })
    this.walletDisplay = page.locator('[aria-label*="Balance"], [aria-label*="Wallet"]')
    this.harvestPanel = page.locator('.nebula-scan-panel')
    this.latestReward = page.locator('.scan-reward')
    this.inventory = page.locator('.inventory-panel')
    this.harvestLog = page.locator('.harvest-panel')
    this.inventoryFilterAll = page.getByRole('button', { name: /filter resources by all/i })
    this.inventoryFilterStocked = page.getByRole('button', { name: /filter resources by stocked/i })
  }

  async goto() {
    await this.page.goto('/nebula')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForCanvas(timeout = 15000) {
    await this.canvas.waitFor({ state: 'visible', timeout })
  }

  async waitForPageReady() {
    await this.page.getByRole('main').waitFor({ state: 'visible' })
    await this.waitForCanvas().catch(() => {})
  }

  async getVisibleAction(): Promise<'connect' | 'scan' | 'none'> {
    // Wait a bit for either to appear
    await Promise.race([
      this.connectPrompt.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      this.scanButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    ])
    if (await this.connectPrompt.isVisible().catch(() => false)) return 'connect'
    if (await this.scanButton.isVisible().catch(() => false)) return 'scan'
    return 'none'
  }

  async clickCanvasAt(x = 300, y = 300) {
    const box = await this.canvas.boundingBox()
    if (!box) throw new Error('Canvas not visible')
    await this.page.mouse.click(box.x + x, box.y + y)
  }

  async scanAnomaly() {
    // Try to find scan points - clickable anomalies in canvas
    // Fallback: click canvas center
    await this.waitForCanvas()
    await this.clickCanvasAt(200, 200)
    // Wait for potential reward update
    await this.page.waitForTimeout(800)
  }

  async getHarvestTotals() {
    const cards = this.page.locator('.harvest-totals .metric-card')
    const count = await cards.count()
    const totals: Record<string, string> = {}
    for (let i = 0; i < count; i++) {
      const label = await cards.nth(i).locator('.metric-label').textContent()
      const value = await cards.nth(i).locator('strong').textContent()
      if (label && value) totals[label.trim()] = value.trim()
    }
    return totals
  }

  async getInventoryRows() {
    return this.page.locator('.resource-card')
  }

  async filterInventory(filter: 'all' | 'stocked' | 'low' | 'empty') {
    const btn = this.page.getByRole('button', {
      name: new RegExp(`filter resources by ${filter}`, 'i'),
    })
    await btn.click()
  }

  async isInventoryVisible() {
    return this.inventory
      .first()
      .isVisible()
      .catch(() => false)
  }

  async getCanvasAccessibleLabel() {
    return this.canvas.getAttribute('aria-label')
  }
}
