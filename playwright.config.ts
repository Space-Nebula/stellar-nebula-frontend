import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Global per-test budget. 60s gives slow WebGL/canvas + wallet-mock flows
  // headroom on CI without masking real hangs (see E2E_BEST_PRACTICES.md).
  timeout: 60_000,
  // Auto-retrying assertions (toBeVisible, toHaveURL, expect.poll, ...) wait
  // up to this long before failing. 10s absorbs CI jitter; state-based waits
  // in e2e/helpers/wait-helpers.ts build on top of this.
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    // Individual action budget (click, fill, selectOption). Fails fast on
    // detached/hidden elements instead of hanging until the test timeout.
    actionTimeout: 15_000,
    // Navigation budget (page.goto, reload). Stellar/Horizon polling can keep
    // connections open, so page objects prefer domcontentloaded +
    // waitForNetworkIdleSafe over a bare 'networkidle' wait.
    navigationTimeout: 30_000,
    // Deterministic rendering: reduce motion to avoid animation-driven flakes.
    reducedMotion: 'reduce',
    // Keep the trace of every failed attempt (not only the first retry) so the
    // CI artifact always has one for the failing test.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    // Vite cold start + first WebGL compile can exceed 2 min on CI runners.
    timeout: 180_000,
  },
})
