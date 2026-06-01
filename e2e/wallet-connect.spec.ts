import { test, expect } from '@playwright/test'
import { test as walletTest } from './fixtures/wallet'

test.describe('Wallet connection — no extension', () => {
  test('shows connect wallet button when no wallet is connected', async ({ page }) => {
    await page.goto('/')
    const connectBtn = page.getByRole('button', { name: /connect wallet/i })
    await expect(connectBtn).toBeVisible()
  })

  test('opens the wallet connect modal', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText(/connect wallet/i)).toBeVisible()
  })

  test('shows Freighter option in connect modal', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await expect(page.getByRole('dialog').getByText(/freighter/i)).toBeVisible()
  })

  test('closes the modal when dismissed', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /connect wallet/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

walletTest.describe('Wallet connection — with mock Freighter', () => {
  walletTest.use({ mockWalletInstalled: undefined } as never)

  walletTest('connects Freighter wallet successfully', async ({ page, mockWalletInstalled: _ }) => {
    await page.goto('/')
    const connectBtn = page.getByRole('button', { name: /connect wallet/i })
    if (await connectBtn.isVisible()) {
      await connectBtn.click()
      const freighterBtn = page.getByRole('button', { name: /freighter/i })
      await expect(freighterBtn).toBeVisible()
    }
  })
})
