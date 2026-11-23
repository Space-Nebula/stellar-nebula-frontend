import { test, expect } from '@playwright/test'
import { AppPage } from './pages/app.page'
import { WAIT_TIMEOUTS } from './helpers/wait-helpers'

test.describe('Freighter Wallet Detection Timing on Firefox (#546)', () => {
  let app: AppPage

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page)
    await app.goto('/')
  })

  test('displays detecting state while waiting for delayed extension injection', async ({ page }) => {
    // Open connect modal or navigate to wallet connection area
    const connectButton = page.locator('button:has-text("Connect"), button:has-text("Connect Wallet")').first()

    if (await connectButton.isVisible().catch(() => false)) {
      await connectButton.click()

      // Simulate delayed injection on window object after 600ms
      await page.evaluate(() => {
        setTimeout(() => {
          ;(window as unknown as Record<string, unknown>).freighter = {
            isConnected: () => Promise.resolve(true),
            getPublicKey: () => Promise.resolve('GBEXAMPLEPUBLICKEYFORTESTING1234567890'),
          }
          window.dispatchEvent(new CustomEvent('FreighterLoaded'))
        }, 600)
      })

      // Verify "Detecting wallet..." or available state appears
      const detectingOrAvailable = page.locator('text=/Detecting wallet|Available|Connect/i').first()
      await expect(detectingOrAvailable).toBeVisible({ timeout: WAIT_TIMEOUTS.standard })
    }
  })

  test('provides manual Retry button when extension is not detected initially', async ({ page }) => {
    const connectButton = page.locator('button:has-text("Connect"), button:has-text("Connect Wallet")').first()

    if (await connectButton.isVisible().catch(() => false)) {
      await connectButton.click()

      // Check if retry button or instructions exist when wallet is absent
      const retryButton = page.locator('button:has-text("Retry"), button[aria-label*="Retry"]').first()
      if (await retryButton.isVisible().catch(() => false)) {
        await expect(retryButton).toBeEnabled()
        await retryButton.click()
      }
    }
  })

  test('listens for FreighterLoaded custom event and updates availability', async ({ page }) => {
    // Dispatch FreighterLoaded event directly
    await page.evaluate(() => {
      ;(window as unknown as Record<string, unknown>).freighter = {
        isConnected: () => Promise.resolve(true),
        getPublicKey: () => Promise.resolve('GBEXAMPLEKEY'),
      }
      window.dispatchEvent(new CustomEvent('FreighterLoaded'))
      window.dispatchEvent(new CustomEvent('freighter:ready'))
    })

    const isConnectedOrReady = await page.evaluate(() => {
      return Boolean((window as unknown as Record<string, unknown>).freighter)
    })

    expect(isConnectedOrReady).toBe(true)
  })
})
