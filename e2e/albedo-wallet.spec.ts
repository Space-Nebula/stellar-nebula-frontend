import { test, expect, ALBEDO_MOCK_PUBLIC_KEY } from './fixtures/albedo'
import { WalletPage } from './pages/wallet.page'
import { WAIT_TIMEOUTS } from './helpers/wait-helpers'

test.describe('Albedo wallet integration', () => {
  let wallet: WalletPage

  test.beforeEach(async ({ page }) => {
    // Skip the first-visit onboarding modal so it cannot intercept clicks.
    await page.addInitScript(() => {
      localStorage.setItem(
        'stellar-nebula:tutorial-store',
        JSON.stringify({
          state: {
            completed: true,
            currentStep: 0,
            dismissed: true,
            startedAt: new Date().toISOString(),
            completedObjectives: [],
          },
          version: 1,
        })
      )
    })

    wallet = new WalletPage(page)
    await wallet.goto('/')
  })

  test('offers Albedo as a web wallet without an extension', async () => {
    await wallet.openConnectModal()

    await expect(wallet.albedoButton).toBeVisible()
    await expect(wallet.albedoButton).toBeEnabled()
    await expect(wallet.albedoButton).toHaveAttribute('aria-label', /connect with albedo wallet/i)
    await expect(wallet.dialog.getByText(/web-based wallet/i)).toBeVisible()
  })

  test('connects through the Albedo popup and shows the account', async ({
    page,
    mockAlbedoPopup,
  }) => {
    await mockAlbedoPopup()

    await wallet.openConnectModal()
    await wallet.selectAlbedo()

    // A successful intent closes the connect modal and renders the wallet chip.
    await expect(wallet.disconnectButton).toBeVisible({ timeout: WAIT_TIMEOUTS.slow })
    await expect(page.getByTitle(ALBEDO_MOCK_PUBLIC_KEY)).toBeVisible()
    await expect(wallet.dialog).not.toBeVisible()
  })

  test('surfaces a rejected Albedo request without connecting', async ({
    page,
    mockAlbedoPopup,
  }) => {
    await mockAlbedoPopup({ reject: true })

    await wallet.openConnectModal()
    await wallet.selectAlbedo()

    await expect(page.getByRole('alert')).toHaveText(/rejected/i, {
      timeout: WAIT_TIMEOUTS.slow,
    })
    await expect(wallet.dialog).toBeVisible()
    await expect(wallet.disconnectButton).not.toBeVisible()
  })

  test('can disconnect after an Albedo session', async ({ page, mockAlbedoPopup }) => {
    await mockAlbedoPopup()

    await wallet.openConnectModal()
    await wallet.selectAlbedo()
    await expect(wallet.disconnectButton).toBeVisible({ timeout: WAIT_TIMEOUTS.slow })

    await wallet.disconnect()

    await expect(page.getByRole('button', { name: /connect wallet/i }).first()).toBeVisible()
    await expect(wallet.disconnectButton).not.toBeVisible()
  })

  test('Albedo option is keyboard accessible', async ({ page, mockAlbedoPopup }) => {
    await mockAlbedoPopup()
    await wallet.openConnectModal()

    await wallet.albedoButton.focus()
    await expect(wallet.albedoButton).toBeFocused()

    await page.keyboard.press('Enter')

    await expect(wallet.disconnectButton).toBeVisible({ timeout: WAIT_TIMEOUTS.slow })
  })
})
