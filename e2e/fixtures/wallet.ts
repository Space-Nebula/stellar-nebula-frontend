import { test as base, type Page } from '@playwright/test'

export type WalletFixtures = {
  mockWalletInstalled: void
}

export const test = base.extend<WalletFixtures>({
  mockWalletInstalled: [
    async ({ page }, use) => {
      // Inject a mock Freighter wallet before every test
      await page.addInitScript(() => {
        const mockPublicKey = 'GAHTJRCKMIQWJSLS6OGCHZMAKSDBUQGIT4AJGBE6KCAJBKNNCLSYTRDS'

        Object.defineProperty(window, 'freighter', {
          value: {
            isConnected: () => Promise.resolve(true),
            getPublicKey: () => Promise.resolve(mockPublicKey),
            getNetwork: () => Promise.resolve('TESTNET'),
            getNetworkDetails: () =>
              Promise.resolve({
                network: 'TESTNET',
                networkPassphrase: 'Test SDF Network ; September 2015',
                networkUrl: 'https://horizon-testnet.stellar.org',
              }),
            signTransaction: (xdr: string) => Promise.resolve({ signedTxXdr: xdr }),
          },
          writable: true,
        })
      })

      await use()
    },
    { auto: false },
  ],
})

export { expect } from '@playwright/test'

export async function connectWallet(page: Page) {
  await page.getByRole('button', { name: /connect wallet/i }).click()
  await page.getByRole('button', { name: /freighter/i }).click()
  await page.waitForSelector('[data-testid="wallet-connected"]', { timeout: 10000 })
}
