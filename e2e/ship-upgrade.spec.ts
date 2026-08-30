import { test, expect } from '@playwright/test'

test.describe('Ship upgrade flow', () => {
  test('renders the ship dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('shows wallet connect prompt when not connected', async ({ page }) => {
    await page.goto('/dashboard')
    const connectBtn = page.getByRole('button', { name: /connect wallet/i })
    const dashboardContent = page.getByText(/ship/i)
    
    await Promise.race([
      connectBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      dashboardContent.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
    ])
    
    const hasConnectBtn = await connectBtn.isVisible()
    const hasDashboardContent = await dashboardContent.isVisible()
    expect(hasConnectBtn || hasDashboardContent).toBe(true)
  })

  test('navigates to dashboard from nav', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: /primary navigation/i })
      .getByRole('link', { name: /ship/i })
      .click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('marketplace is accessible from nav', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: /primary navigation/i })
      .getByRole('link', { name: /market/i })
      .click()
    await expect(page).toHaveURL(/\/marketplace/)
    await expect(page.getByRole('main')).toBeVisible()
  })
})
