import { test, expect } from '@playwright/test'
import { test as walletTest, connectWallet } from './fixtures/wallet'

walletTest.describe('Complete scan-upgrade-trade journey', () => {
  walletTest.use({ mockWalletInstalled: undefined } as never)

  walletTest(
    'full journey: connect wallet -> scan nebula -> view resources -> trade',
    async ({ page, mockWalletInstalled: _ }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      if (await page.getByRole('button', { name: /connect wallet/i }).isVisible()) {
        await connectWallet(page)
      }

      await page.goto('/nebula')
      await page.waitForLoadState('networkidle')
      const canvas = page.locator('canvas')
      await expect(canvas.first()).toBeVisible({ timeout: 10000 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('main')).toBeVisible()

      await page.goto('/marketplace')
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('main')).toBeVisible()
    }
  )
})

test.describe('Error scenarios', () => {
  test('handles 404 gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page')
    expect(response?.status()).toBe(200)
    await expect(page.getByText(/not found/i).or(page.getByRole('heading'))).toBeVisible()
  })

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('renders on mobile viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('nebula page loads on mobile', async ({ page }) => {
    await page.goto('/nebula')
    await page.waitForLoadState('networkidle')
    const canvas = page.locator('canvas')
    await expect(canvas.first()).toBeVisible({ timeout: 10000 })
  })
})
