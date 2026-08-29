import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import './styles/base.css'
import { initErrorTracking } from './services/errorTracking'
import { logger } from './services/logging'
import { initializeMonitoring } from './services/monitoring'
import { repairCorruptedSaveData } from './services/saveLoad'
import { env } from './config'

// Validate/repair raw localStorage before any zustand store module (pulled
// in transitively by App) hydrates from it, so a corrupted save can't crash
// startup.
const saveRepairReport = repairCorruptedSaveData()
if (saveRepairReport.cleared.length > 0) {
  logger.warn('Corrupted save data cleared on startup', {
    cleared: saveRepairReport.cleared,
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

// Initialize monitoring services (Sentry + LogRocket)
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
