import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'
import { NotificationProvider, WalletProvider } from './contexts'
import { ThemeProvider } from './contexts/ThemeContext'
import { InstallPrompt } from './components/PWA/InstallPrompt'
import { OfflineIndicator } from './components/PWA/OfflineIndicator'
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
          <NotificationProvider>
            <RouterProvider router={router} />
            <InstallPrompt />
            <OfflineIndicator />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'rgba(9, 17, 33, 0.96)',
                  color: '#f8fbff',
                  border: '1px solid rgba(159, 216, 255, 0.24)',
                },
              }}
            />
          </NotificationProvider>
        </WalletProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
