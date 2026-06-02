import { test, expect } from '@playwright/test'

test.describe('Nebula scan page', () => {
  test('renders the nebula view', async ({ page }) => {
    await page.goto('/nebula')
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('shows nebula canvas element', async ({ page }) => {
    await page.goto('/nebula')
    await page.waitForLoadState('networkidle')
    const canvas = page.locator('canvas')
    await expect(canvas.first()).toBeVisible({ timeout: 10000 })
  })

  test('shows connect prompt for unauthenticated scan', async ({ page }) => {
    await page.goto('/nebula')
    await page.waitForLoadState('networkidle')
    const connectPrompt = page.getByRole('button', { name: /connect wallet/i })
    const scanButton = page.getByRole('button', { name: /scan nebula/i })
    const hasConnectPrompt = await connectPrompt.isVisible()
    const hasScanButton = await scanButton.isVisible()
    expect(hasConnectPrompt || hasScanButton).toBe(true)
  })

  test('navigates to nebula from nav link', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: /primary navigation/i })
      .getByRole('link', { name: /nebula/i })
      .click()
    await expect(page).toHaveURL(/\/nebula/)
  })
})
