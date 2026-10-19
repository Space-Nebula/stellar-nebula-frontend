import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import './styles/base.css'
import './styles/mobile.css'
import { logger } from './services/logging'
import { repairCorruptedSaveData } from './services/saveLoad'
import { initWebVitalsMonitoring } from './hooks/useWebVitals'
import { env } from './config'
import { preloadCriticalAssets } from './utils/preload'

// Preload critical fonts, icons, and hero assets early to improve LCP and CLS (#379)
preloadCriticalAssets()

// Validate/repair raw localStorage before any zustand store module (pulled
// in transitively by App) hydrates from it, so a corrupted save can't crash
// startup.
const saveRepairReport = repairCorruptedSaveData()
if (saveRepairReport.cleared.length > 0) {
  logger.warn('Corrupted save data cleared on startup', {
    clearedCount: saveRepairReport.cleared.length,
    keys: saveRepairReport.cleared.map((c) => c.key).join(', '),
  })
}

// Initialize structured logging first
if (env.LOG_LEVEL) {
  logger.setLogLevel(env.LOG_LEVEL)
}

logger.info('Application starting', {
  environment: env.NODE_ENV,
  version: env.APP_VERSION,
  appName: env.APP_NAME,
})

// Initialize Web Vitals performance monitoring (#365)
initWebVitalsMonitoring()

// Imported dynamically (rather than statically at the top of this file) so
// that repairCorruptedSaveData() above has already run before App - and the
// zustand store modules it transitively imports - are evaluated and hydrate
// from localStorage.
const { default: App } = await import('./App.tsx')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>An unexpected error occurred.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
)

/**
 * Initializes Sentry and LogRocket after the app has already rendered, during an
 * idle period. Sentry.init()/LogRocket.init() do real work on the main thread
 * (wiring up tracing, replay, breadcrumbs); running that before the first render
 * directly delayed Time To Interactive (#382). The monitoring/error-tracking
 * modules themselves are also only fetched here via a dynamic import, instead of
 * being statically imported at the top of this file, so they are not part of the
 * initial critical-path bundle either.
 */
function scheduleMonitoringInit(): void {
  const run = async () => {
    const [{ initializeMonitoring }, { initErrorTracking }] = await Promise.all([
      import('./services/monitoring'),
      import('./services/errorTracking'),
    ])

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

    // Also initialize Sentry directly for backward compatibility with existing error tracking setup
    const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
    if (SENTRY_DSN) {
      initErrorTracking({
        dsn: SENTRY_DSN,
        environment: import.meta.env.VITE_APP_ENV ?? 'development',
        release: import.meta.env.VITE_APP_VERSION || undefined,
      })
    }

    logger.info('Monitoring and logging initialized')
  }

  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  }

  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(() => void run(), { timeout: 2000 })
  } else {
    setTimeout(() => void run(), 0)
  }
}

scheduleMonitoringInit()
