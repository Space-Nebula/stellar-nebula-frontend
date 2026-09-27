import { useEffect, useRef } from 'react'
import { showToast, dismissToast } from '@/utils/toast'
import { trackEvent } from '@/services/analytics'

/**
 * How long the user can be idle (no mouse/keyboard activity) after an update
 * notification appears before it is applied automatically (issue #325).
 */
const AUTO_APPLY_IDLE_MS = 5 * 60 * 1000

/**
 * Registers the service worker (issue #325) and, when a new one is waiting,
 * shows a persistent toast with a Refresh action instead of the update
 * silently taking over. If the user goes idle for `AUTO_APPLY_IDLE_MS`
 * after that, the update is applied automatically so it isn't stuck waiting
 * forever on an abandoned tab.
 *
 * `registerType: 'prompt'` in vite.config.ts is what makes `onNeedRefresh`
 * fire instead of the plugin activating the new worker on its own.
 */
export function useServiceWorkerUpdate(): void {
  const cleanupIdleRef = useRef<() => void>(() => {})

  useEffect(() => {
    let cancelled = false

    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return

        const updateSW = registerSW({
          onNeedRefresh() {
            trackEvent('sw_update_available', {})

            const applyUpdate = (trigger: 'manual' | 'idle') => {
              cleanupIdleRef.current()
              dismissToast(toastId)
              trackEvent('sw_update_applied', { trigger })
              void updateSW(true)
            }

            const toastId = showToast('A new version is available.', {
              type: 'info',
              duration: Infinity,
              action: { label: 'Refresh', onClick: () => applyUpdate('manual') },
            })

            let idleTimer = setTimeout(() => applyUpdate('idle'), AUTO_APPLY_IDLE_MS)
            const resetIdleTimer = () => {
              clearTimeout(idleTimer)
              idleTimer = setTimeout(() => applyUpdate('idle'), AUTO_APPLY_IDLE_MS)
            }
            window.addEventListener('mousemove', resetIdleTimer)
            window.addEventListener('keydown', resetIdleTimer)
            window.addEventListener('touchstart', resetIdleTimer)

            cleanupIdleRef.current = () => {
              clearTimeout(idleTimer)
              window.removeEventListener('mousemove', resetIdleTimer)
              window.removeEventListener('keydown', resetIdleTimer)
              window.removeEventListener('touchstart', resetIdleTimer)
              cleanupIdleRef.current = () => {}
            }
          },
          onOfflineReady() {
            showToast('Ready to work offline.', { type: 'success' })
          },
        })
      })
      .catch(() => {
        // Dev server / test environments without the PWA plugin active:
        // no service worker to register, nothing to notify about.
      })

    return () => {
      cancelled = true
      cleanupIdleRef.current()
    }
  }, [])
}
