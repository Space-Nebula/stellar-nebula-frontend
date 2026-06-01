import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { WalletProvider } from './contexts/WalletContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { router } from './routes'
import './App.css'
import { createScopedLogger } from './services/logging'
import { analytics } from './services/analytics'
import { env } from './config'

const log = createScopedLogger('App')

function App() {
  useEffect(() => {
    // Initialize analytics with environment configuration
    log.info('Initializing application')

    // Configure analytics with endpoint if provided
    if (env.ANALYTICS_ENDPOINT) {
      analytics.configure({
        endpoint: env.ANALYTICS_ENDPOINT,
        enabled: true,
      })
      log.info('Analytics configured', { endpoint: env.ANALYTICS_ENDPOINT })
    }

    // Track app initialization
    analytics.track('scan_started', {
      appName: env.APP_NAME,
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
    })

    log.info('Application initialized', {
      appName: env.APP_NAME,
      version: env.APP_VERSION,
    })
  }, [])

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <WalletProvider>
          <RouterProvider router={router} />
        </WalletProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
