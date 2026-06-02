import type { Page, Locator } from '@playwright/test'

export class AppPage {
  readonly page: Page
  readonly nav: Locator
  readonly homeLink: Locator
  readonly nebulaLink: Locator
  readonly shipLink: Locator
  readonly marketLink: Locator

  constructor(page: Page) {
    this.page = page
    this.nav = page.getByRole('navigation', { name: /primary navigation/i })
    this.homeLink = this.nav.getByRole('link', { name: /home/i })
    this.nebulaLink = this.nav.getByRole('link', { name: /nebula/i })
    this.shipLink = this.nav.getByRole('link', { name: /ship/i })
    this.marketLink = this.nav.getByRole('link', { name: /market/i })
  }

  async goto(path = '/') {
    await this.page.goto(path)
  }

  async navigateTo(route: 'home' | 'nebula' | 'ship' | 'market') {
    const linkMap = {
      home: this.homeLink,
      nebula: this.nebulaLink,
      ship: this.shipLink,
      market: this.marketLink,
    }
    await linkMap[route].click()
  }
}
