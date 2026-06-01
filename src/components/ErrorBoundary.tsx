import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { trackEvent } from '../services/analytics'
import { captureError } from '../services/errorTracking'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    captureError(error, { componentStack: errorInfo.componentStack })
    trackEvent('error_reported', {
      errorName: error.name || 'Error',
      componentStack: errorInfo.componentStack ? 'available' : 'missing',
    })
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
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
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
