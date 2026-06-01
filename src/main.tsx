import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import './styles/base.css'
import App from './App.tsx'
import { initErrorTracking } from './services/errorTracking'
import { logger } from './services/logging'
import { initializeMonitoring } from './services/monitoring'
import { env } from './config'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>An unexpected error occurred.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
)
