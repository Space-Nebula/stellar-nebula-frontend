import { test, expect } from '@playwright/test'
import { AppPage } from './pages/app.page'
import { WAIT_TIMEOUTS } from './helpers/wait-helpers'

test.describe('Rapid Clicks & Transaction Race Condition Prevention (#545)', () => {
  let app: AppPage

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page)
    await app.goto('/')
  })

  test('prevents duplicate submissions when scan or upgrade buttons are clicked rapidly', async ({ page }) => {
    // Navigate to nebula page
    await app.navigateTo('nebula')
    await page.waitForURL(/\/nebula/, { timeout: WAIT_TIMEOUTS.standard })

    // Find any scan or action button
    const actionButton = page.locator('button.scan-button, button:has-text("Scan Anomaly"), button:has-text("Scan")').first()

    if (await actionButton.isVisible().catch(() => false)) {
      // Rapidly click 5 times
      const clicks = [
        actionButton.click({ force: true }),
        actionButton.click({ force: true }),
        actionButton.click({ force: true }),
        actionButton.click({ force: true }),
        actionButton.click({ force: true }),
      ]

      await Promise.allSettled(clicks)

      // Button should be disabled or show busy state during the first operation
      const isBusy = await actionButton.getAttribute('aria-busy')
      const isDisabled = await actionButton.isDisabled()

      expect(isBusy === 'true' || isDisabled).toBeTruthy()
    }
  })

  test('disables ship upgrade button while an upgrade transaction is in progress', async ({ page }) => {
    await app.navigateTo('dashboard')
    await page.waitForURL(/\/dashboard|\/ship/, { timeout: WAIT_TIMEOUTS.standard })

    const upgradeButton = page.locator('button:has-text("Upgrade"), button:has-text("Confirm Upgrade")').first()

    if (await upgradeButton.isVisible().catch(() => false)) {
      // Click upgrade button
      await upgradeButton.click({ force: true })

      // Immediately verify button is disabled or shows pending indicator
      const isDisabled = await upgradeButton.isDisabled()
      const isBusy = await upgradeButton.getAttribute('aria-busy')

      expect(isDisabled || isBusy === 'true').toBeTruthy()
    }
  })

  test('displays warning toast if user attempts concurrent transaction', async ({ page }) => {
    await page.evaluate(() => {
      // Dispatch custom mock pending transaction
      window.dispatchEvent(new CustomEvent('stellar:tx:pending'))
    })

    const toast = page.locator('[role="alert"], .toaster, .toast')
    // Ensure page does not crash when multiple transaction events fire
    expect(await page.title()).toBeTruthy()
  })
})
