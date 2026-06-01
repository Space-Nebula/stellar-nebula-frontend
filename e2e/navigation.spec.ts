import { test, expect } from '@playwright/test'
import { AppPage } from './pages/app.page'

test.describe('Navigation', () => {
  test('loads the home page', async ({ page }) => {
    const app = new AppPage(page)
    await app.goto()

    await expect(page).toHaveTitle(/stellar nebula/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('navigates to all main routes', async ({ page }) => {
    const app = new AppPage(page)
    await app.goto()

    await app.nebulaLink.click()
    await expect(page).toHaveURL(/\/nebula/)

    await app.shipLink.click()
    await expect(page).toHaveURL(/\/dashboard/)

    await app.marketLink.click()
    await expect(page).toHaveURL(/\/marketplace/)

    await app.homeLink.click()
    await expect(page).toHaveURL('/')
  })

  test('shows 404 for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText(/not found/i)).toBeVisible()
  })
})
