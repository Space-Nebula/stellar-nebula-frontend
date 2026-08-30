import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { captureError } from '@/services/errorTracking'
import { trackEvent } from '@/services/analytics'

const MAX_AUTO_RETRIES = 1
const TRANSIENT_ERROR_PATTERN = /(network|fetch|timeout|loading|resource|socket|abort)/i

export interface FeatureErrorBoundaryProps {
  /** Human-readable name used in logging and the fallback UI (e.g. "Nebula Canvas") */
  feature: string
  children: ReactNode
  /** Optional custom fallback. If omitted the built-in compact fallback is shown. */
  fallback?: ReactNode
  /** Called after the boundary catches an error */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  recoveryAttempts: number
}

/**
 * FeatureErrorBoundary
 *
 * A compact, feature-scoped error boundary. Wrap each major UI section
 * (Canvas, Marketplace, Leaderboard, Dashboard panels, etc.) so that a
 * single broken component cannot crash the entire page.
 *
 * Features:
 * - Auto-retries once for transient (network/fetch) errors
 * - "Try Again" + "Reload" recovery buttons in the fallback UI
 * - Logs to Sentry via captureError
 * - Fires analytics event for observability
 */
class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, State> {
  private retryTimeoutId: number | null = null

  constructor(props: FeatureErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, recoveryAttempts: 0 }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, recoveryAttempts: 0 }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { feature, onError } = this.props
    const isTransient = TRANSIENT_ERROR_PATTERN.test(error.message)

    console.error(`[FeatureErrorBoundary:${feature}] caught:`, error, errorInfo)

    captureError(error, {
      feature,
      componentStack: errorInfo.componentStack,
    })

    trackEvent('error_reported', {
      errorName: error.name || 'Error',
      feature,
      componentStack: errorInfo.componentStack ? 'available' : 'missing',
      autoRetry: isTransient,
    })

    if (isTransient && this.state.recoveryAttempts < MAX_AUTO_RETRIES) {
      const attempt = this.state.recoveryAttempts + 1
      console.warn(`[FeatureErrorBoundary:${feature}] auto-retry ${attempt}/${MAX_AUTO_RETRIES}`)
      this.retryTimeoutId = window.setTimeout(() => {
        this.setState({ hasError: false, error: null, recoveryAttempts: attempt })
      }, 1000)
    }

    onError?.(error, errorInfo)
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId !== null) {
      window.clearTimeout(this.retryTimeoutId)
    }
  }

  handleReset = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      recoveryAttempts: prev.recoveryAttempts + 1,
    }))
  }

  render() {
    const { hasError, error } = this.state
    const { feature, children, fallback } = this.props

    if (!hasError) return children

    if (fallback !== undefined) return fallback

    return (
      <div role="alert" className="feature-error-boundary">
        <div className="feature-error-icon" aria-hidden="true">
          ⚠️
        </div>

        <h2 className="feature-error-title">{feature} is unavailable</h2>

        <p className="feature-error-message">
          {error?.message ?? 'An unexpected error occurred in this section.'}
        </p>

        <div className="feature-error-actions">
          <button
            type="button"
            className="feature-error-btn feature-error-btn--primary"
            onClick={this.handleReset}
            aria-label={`Try to recover the ${feature} section`}
          >
            Try Again
          </button>
          <button
            type="button"
            className="feature-error-btn feature-error-btn--ghost"
            onClick={() => window.location.reload()}
            aria-label="Reload the full application"
          >
            Reload App
          </button>
        </div>
      </div>
    )
  }
}

export default FeatureErrorBoundary
