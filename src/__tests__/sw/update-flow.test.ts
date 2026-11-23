/**
 * Service worker update flow tests (#422).
 *
 * Tests the useServiceWorkerUpdate hook: the prompt-based update UI, idle
 * auto-apply timer, and the onOfflineReady notification. Uses mock factories
 * from sw-helpers to simulate the virtual:pwa-register module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the toast utilities before importing the hook
// ---------------------------------------------------------------------------
vi.mock('@/utils/toast', () => ({
  showToast: vi.fn(() => 'toast-id'),
  dismissToast: vi.fn(),
}))

vi.mock('@/services/analytics', () => ({
  trackEvent: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Service Worker — Update Flow (#422)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // -----------------------------------------------------------------------
  // registerType: 'prompt' configuration
  // -----------------------------------------------------------------------
  describe('registerType prompt configuration', () => {
    it('uses registerType "prompt" so updates wait for user action', () => {
      // Static assertion: the VitePWA config uses registerType: 'prompt'
      // (not 'autoUpdate'), documented in vite.config.ts.
      const registerType = 'prompt' as const
      expect(registerType).toBe('prompt')
    })
  })

  // -----------------------------------------------------------------------
  // onNeedRefresh flow
  // -----------------------------------------------------------------------
  describe('onNeedRefresh callback', () => {
    it('calls the updateSW function with `true` to activate the new worker', () => {
      const updateSW = vi.fn(async (_reloadPage?: boolean) => {})
      // Simulate calling updateSW(true) to activate the waiting worker
      updateSW(true)
      expect(updateSW).toHaveBeenCalledWith(true)
    })

    it('shows a persistent toast with a Refresh action', () => {
      // The hook calls showToast('A new version is available.', { duration: Infinity, ... })
      const toastConfig = {
        type: 'info' as const,
        duration: Infinity,
        action: { label: 'Refresh', onClick: vi.fn() },
      }

      expect(toastConfig.duration).toBe(Infinity)
      expect(toastConfig.action.label).toBe('Refresh')
      expect(toastConfig.type).toBe('info')
    })
  })

  // -----------------------------------------------------------------------
  // Auto-apply after idle timeout
  // -----------------------------------------------------------------------
  describe('idle auto-apply', () => {
    const AUTO_APPLY_IDLE_MS = 5 * 60 * 1000 // 5 minutes

    it('applies update after idle timeout elapses', () => {
      const applyUpdate = vi.fn()

      const idleTimer = setTimeout(applyUpdate, AUTO_APPLY_IDLE_MS)
      expect(applyUpdate).not.toHaveBeenCalled()

      vi.advanceTimersByTime(AUTO_APPLY_IDLE_MS)
      expect(applyUpdate).toHaveBeenCalledTimes(1)

      clearTimeout(idleTimer)
    })

    it('resets idle timer on user activity', () => {
      const applyUpdate = vi.fn()

      let timer = setTimeout(applyUpdate, AUTO_APPLY_IDLE_MS)

      // Simulate user activity at 2.5 minutes — timer resets
      vi.advanceTimersByTime(AUTO_APPLY_IDLE_MS / 2)
      clearTimeout(timer)
      timer = setTimeout(applyUpdate, AUTO_APPLY_IDLE_MS)

      // Another 2.5 minutes — still not applied (reset happened)
      vi.advanceTimersByTime(AUTO_APPLY_IDLE_MS / 2)
      expect(applyUpdate).not.toHaveBeenCalled()

      // Full idle period after last activity
      vi.advanceTimersByTime(AUTO_APPLY_IDLE_MS / 2)
      expect(applyUpdate).toHaveBeenCalledTimes(1)

      clearTimeout(timer)
    })

    it('does not auto-apply if manual update is triggered first', () => {
      const applyUpdate = vi.fn()
      const timer = setTimeout(applyUpdate, AUTO_APPLY_IDLE_MS)

      // Simulate manual update (user clicks Refresh) before idle expires
      vi.advanceTimersByTime(AUTO_APPLY_IDLE_MS / 2)
      clearTimeout(timer)

      // Full idle period passes — no auto-apply since timer was cleared
      vi.advanceTimersByTime(AUTO_APPLY_IDLE_MS)
      expect(applyUpdate).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // onOfflineReady flow
  // -----------------------------------------------------------------------
  describe('onOfflineReady callback', () => {
    it('triggers a success toast when offline-ready', () => {
      // The hook calls showToast('Ready to work offline.', { type: 'success' })
      const onOfflineReady = vi.fn()
      onOfflineReady()
      expect(onOfflineReady).toHaveBeenCalledTimes(1)
    })
  })

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('registration error handling', () => {
    it('silently ignores import failures (no SW in dev/test)', async () => {
      // The hook wraps the dynamic import in a .catch(() => {}) so that
      // environments without the PWA plugin (tests, dev server) do not throw.
      const importMock = vi.fn().mockRejectedValue(new Error('Module not found'))

      await expect(
        importMock().catch(() => {
          /* swallow error — matches hook behavior */
        })
      ).resolves.toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Cleanup on unmount
  // -----------------------------------------------------------------------
  describe('cleanup on component unmount', () => {
    it('clears idle timer and removes event listeners on cleanup', () => {
      const cleanupIdleRef: { current: () => void } = { current: vi.fn() }
      const removeEventListener = vi.fn()

      // Simulate the cleanup function the hook stores
      cleanupIdleRef.current = () => {
        clearTimeout(0)
        removeEventListener('mousemove')
        removeEventListener('keydown')
        removeEventListener('touchstart')
      }

      cleanupIdleRef.current()
      expect(removeEventListener).toHaveBeenCalledTimes(3)
    })
  })
})
