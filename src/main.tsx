import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import './index.css'
import './styles/base.css'
import './styles/mobile.css'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { logger } from './services/logging'
import { initializeMonitoring } from './services/monitoring'
import { repairCorruptedSaveData } from './services/saveLoad'
import { initWebVitalsMonitoring } from './hooks/useWebVitals'
import { env } from './config'
import { preloadCriticalAssets } from './utils/preload'

// @stellar/stellar-sdk expects a global Buffer in the browser; Vite does not
// polyfill Node globals automatically.
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

// Preload critical fonts, icons, and hero assets early to improve LCP and CLS (#379, #354)
preloadCriticalAssets()

// Validate/repair raw localStorage before any zustand store module hydrates
try {
  const saveRepairReport = repairCorruptedSaveData()
  if (saveRepairReport.cleared.length > 0) {
    logger.warn('Corrupted save data cleared on startup', {
      clearedCount: saveRepairReport.cleared.length,
      keys: saveRepairReport.cleared.map((c) => c.key).join(', '),
    })
  }
} catch {
  // Graceful fallback
}

// Immediate render of App shell for minimal FCP, LCP, and TTI (#354)
const { default: App } = await import('./App.tsx')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<p>An unexpected error occurred.</p>}>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

/**
 * Deferred non-critical background services (#354) and idle Three.js preloading (#353).
 * Offloaded to idle cycles to keep First Contentful Paint and TTI optimal.
 */
function initializeDeferredServices() {
  // Structured logging
  if (env.LOG_LEVEL) {
    logger.setLogLevel(env.LOG_LEVEL)
  }

  logger.info('Application started', {
    environment: env.NODE_ENV,
    version: env.APP_VERSION,
    appName: env.APP_NAME,
  })

  // Monitoring services (Sentry + LogRocket)
  if (env.ENABLE_MONITORING) {
    initializeMonitoring({
      sentryDsn: env.SENTRY_DSN,
      sentryEnvironment: env.NODE_ENV,
      sentryRelease: env.APP_VERSION,
      sentrySampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      sentryReplaySessionRate: env.NODE_ENV === 'production' ? 0.1 : 0.5,
      sentryReplayErrorRate: 1.0,
      logRocketAppId: env.LOGROCKET_APP_ID,
      enablePerformanceMonitoring: true,
    })
  }

  // Direct Sentry initialization
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
  if (SENTRY_DSN) {
    initErrorTracking({
      dsn: SENTRY_DSN,
      environment: import.meta.env.VITE_APP_ENV ?? 'development',
      release: import.meta.env.VITE_APP_VERSION || undefined,
    })
  }

  // Web Vitals monitoring
  initWebVitalsMonitoring()

  // Lazy-load Three.js canvas modules during idle time (#353)
  if (typeof window !== 'undefined') {
    import('@components/Canvas').catch(() => {
      // Ignored if route already navigated
    })
  }
}

if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(initializeDeferredServices, { timeout: 2500 })
  } else {
    setTimeout(initializeDeferredServices, 150)
  }
}
