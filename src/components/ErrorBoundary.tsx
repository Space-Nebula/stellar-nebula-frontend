import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { trackEvent } from '../services/analytics'
import { captureError } from '../services/errorTracking'

const MAX_AUTO_RETRIES = 2
const TRANSIENT_ERROR_PATTERN = /(network|fetch|timeout|loading|resource|socket|abort)/i

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  recoveryAttempts: number
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, recoveryAttempts: 0 }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, recoveryAttempts: 0 }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const shouldAutoRetry = TRANSIENT_ERROR_PATTERN.test(error.message)

    console.error('ErrorBoundary caught an error:', error, errorInfo)
    captureError(error, { componentStack: errorInfo.componentStack })
    trackEvent('error_reported', {
      errorName: error.name || 'Error',
      componentStack: errorInfo.componentStack ? 'available' : 'missing',
      autoRetry: shouldAutoRetry,
    })

    if (shouldAutoRetry && this.state.recoveryAttempts < MAX_AUTO_RETRIES) {
      const attempt = this.state.recoveryAttempts + 1
      const delay = attempt * 750

      console.info(`ErrorBoundary auto-retry scheduled (attempt ${attempt}/${MAX_AUTO_RETRIES})`, {
        delay,
        errorName: error.name,
      })

      this.retryTimeoutId = window.setTimeout(() => {
        this.setState({ hasError: false, error: null, recoveryAttempts: attempt })
        console.info('ErrorBoundary auto-retry triggered', { attempt })
      }, delay)
    }

    this.props.onError?.(error, errorInfo)
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId !== null) {
      window.clearTimeout(this.retryTimeoutId)
    }
  }

  handleReset = (): void => {
    const nextAttempt = this.state.recoveryAttempts + 1
    console.info('ErrorBoundary manual retry triggered', { attempt: nextAttempt })
    this.setState({ hasError: false, error: null, recoveryAttempts: nextAttempt })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback
      }

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 24,
            color: 'rgba(255, 255, 255, 0.87)',
            backgroundColor: '#242424',
          }}
        >
          <h2 style={{ marginBottom: 16, fontSize: '1.5em' }}>Something went wrong</h2>
          <p
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              maxWidth: 480,
              textAlign: 'center',
            }}
          >
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '8px 24px',
                borderRadius: 8,
                border: '1px solid #646cff',
                backgroundColor: '#646cff',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1em',
              }}
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 24px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'transparent',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1em',
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
