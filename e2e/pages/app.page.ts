import type { Page, Locator } from '@playwright/test'

export class AppPage {
  readonly page: Page
  readonly nav: Locator
  readonly mobileNav: Locator
  readonly homeLink: Locator
  readonly nebulaLink: Locator
  readonly shipLink: Locator
  readonly marketLink: Locator
  readonly leaderboardLink: Locator
  readonly header: Locator
  readonly main: Locator
  readonly skipLink: Locator
  readonly hamburger: Locator
  readonly themeToggle: Locator
  readonly notificationTrigger: Locator

  constructor(page: Page) {
    this.page = page
    this.nav = page.getByRole('navigation', { name: /primary navigation/i })
    this.mobileNav = page.getByRole('navigation', { name: /mobile navigation/i })
    this.homeLink = this.nav.getByRole('link', { name: /home/i })
    this.nebulaLink = this.nav.getByRole('link', { name: /nebula/i })
    this.shipLink = this.nav.getByRole('link', { name: /ship/i })
    this.marketLink = this.nav.getByRole('link', { name: /market/i })
    this.leaderboardLink = this.nav.getByRole('link', { name: /leaderboard/i })
    this.header = page.getByRole('banner')
    this.main = page.getByRole('main')
    this.skipLink = page.getByRole('link', { name: /skip to main content/i })
    this.hamburger = page.getByRole('button', { name: /open menu|close menu/i })
    this.themeToggle = page.getByRole('button', {
      name: /switch to (light|dark) mode|toggle dark/i,
    })
    this.notificationTrigger = page.getByRole('button', { name: /notifications/i })
  }

  async goto(path = '/') {
    await this.page.goto(path)
    await this.page.waitForLoadState('networkidle')
  }

  async navigateTo(route: 'home' | 'nebula' | 'ship' | 'market' | 'leaderboard') {
    const linkMap = {
      home: this.homeLink,
      nebula: this.nebulaLink,
      ship: this.shipLink,
      market: this.marketLink,
      leaderboard: this.leaderboardLink,
    }
    await linkMap[route].click()
    await this.page.waitForLoadState('networkidle')
  }

  async openMobileMenuIfVisible() {
    if (await this.hamburger.isVisible().catch(() => false)) {
      const expanded = await this.hamburger.getAttribute('aria-expanded')
      if (expanded !== 'true') await this.hamburger.click()
    }
  }

  async closeMobileMenuIfOpen() {
    if (await this.hamburger.isVisible().catch(() => false)) {
      const expanded = await this.hamburger.getAttribute('aria-expanded')
      if (expanded === 'true') await this.hamburger.click()
    }
  }

  async getTitle() {
    return this.page.title()
  }

  async hasNoConsoleErrors(): Promise<string[]> {
    const errors: string[] = []
    this.page.on('pageerror', (e) => errors.push(e.message))
    return errors
  }

  async waitForMainVisible(timeout = 10000) {
    await this.main.waitFor({ state: 'visible', timeout })
  }
}
