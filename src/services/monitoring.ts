/**
 * Monitoring and Observability Service
 *
 * Integrates multiple monitoring backends:
 * - Sentry: Error tracking, performance monitoring, and replays
 * - LogRocket: Advanced session replay and user analytics
 *
 * This service ensures monitoring is initialized safely and consistently
 * across different environments.
 */

import * as Sentry from '@sentry/react'
import { logger, createScopedLogger } from './logging'

const log = createScopedLogger('Monitoring')

export interface MonitoringConfig {
  sentryDsn: string | null
  sentryEnvironment: string
  sentryRelease?: string
  sentrySampleRate?: number
  sentryReplaySessionRate?: number
  sentryReplayErrorRate?: number
  logRocketAppId: string | null
  enablePerformanceMonitoring: boolean
}

let monitoringInitialized = false

/**
 * Initialize monitoring services.
 * Should be called very early in the application lifecycle, before other code runs.
 */
export function initializeMonitoring(config: MonitoringConfig): void {
  if (monitoringInitialized) {
    log.warn('Monitoring already initialized, skipping duplicate initialization')
    return
  }

  try {
    // Initialize Sentry first if DSN is provided
    if (config.sentryDsn) {
      initializeSentry(config)
    } else {
      log.info('Sentry DSN not provided, error tracking disabled')
    }

    // Initialize LogRocket if app ID is provided
    if (config.logRocketAppId) {
      initializeLogRocket(config.logRocketAppId)
    } else {
      log.info('LogRocket app ID not provided, session replay disabled')
    }

    monitoringInitialized = true
    log.info('Monitoring services initialized successfully')
  } catch (error) {
    log.error(
      'Failed to initialize monitoring services',
      error instanceof Error ? error : new Error(String(error)),
      { config: { ...config, sentryDsn: config.sentryDsn ? '[redacted]' : null } }
    )
  }
}

/**
 * Initialize Sentry for error tracking, performance monitoring, and replays.
 */
function initializeSentry(config: MonitoringConfig): void {
  try {
    Sentry.init({
      dsn: config.sentryDsn!,
      environment: config.sentryEnvironment,
      release: config.sentryRelease,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: config.sentrySampleRate ?? 0.1,
      replaysSessionSampleRate: config.sentryReplaySessionRate ?? 0.1,
      replaysOnErrorSampleRate: config.sentryReplayErrorRate ?? 1.0,
      maxBreadcrumbs: 50,
      beforeSend(event, hint) {
        // Filter out low-level errors that might be noise
        if (event.exception) {
          const error = hint.originalException
          if (
            error instanceof Error &&
            (error.message.includes('ResizeObserver') ||
              error.message.includes('Non-Error promise rejection') ||
              error.message.includes('NetworkError') ||
              error.message.includes('Request timeout'))
          ) {
            return null
          }
        }
        return event
      },
    })

    log.info('Sentry initialized', {
      environment: config.sentryEnvironment,
      release: config.sentryRelease || 'unknown',
    })
  } catch (error) {
    log.error(
      'Failed to initialize Sentry',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

/**
 * Initialize LogRocket for advanced session replay and user analytics.
 * LogRocket captures user interactions, console logs, network activity, and DOM changes.
 */
function initializeLogRocket(appId: string): void {
  try {
    // Dynamically import LogRocket to avoid bundle bloat if not needed
    const LogRocket = (window as any).LogRocket

    if (!LogRocket) {
      // LogRocket script should be loaded in HTML first
      log.warn('LogRocket library not found. Ensure LogRocket script is loaded in HTML.')
      return
    }

    LogRocket.init(appId, {
      console: {
        // Capture all console messages
        shouldAggregateConsoleErrors: true,
      },
      network: {
        // Capture all network requests
        requestSanitizer: (request: any) => {
          // Remove sensitive headers
          if (request.headers) {
            delete request.headers['Authorization']
            delete request.headers['X-API-Key']
          }
          return request
        },
        responseSanitizer: (response: any) => {
          // Sanitize sensitive response data if needed
          return response
        },
      },
      dom: {
        // Capture DOM changes
        inputSanitizer: true,
      },
    })

    // Connect Sentry with LogRocket for unified error tracking
    if (monitoringInitialized && Sentry) {
      LogRocket.getSessionURL((sessionURL: string) => {
        Sentry.captureMessage('LogRocket Session', {
          level: 'info',
          contexts: {
            replay: {
              url: sessionURL,
            },
          },
        })
      })
    }

    log.info('LogRocket initialized successfully')
  } catch (error) {
    log.error(
      'Failed to initialize LogRocket',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

/**
 * Set user context for monitoring (should be called after user authentication).
 */
export function setMonitoringUser(userId: string, email?: string, username?: string): void {
  try {
    // Set Sentry user
    Sentry.setUser({
      id: userId,
      email,
      username,
    })

    // Set LogRocket user if available
    const LogRocket = (window as any).LogRocket
    if (LogRocket) {
      LogRocket.identify(userId, {
        email,
        username,
      })
    }

    log.debug('Monitoring user context set', { userId })
  } catch (error) {
    log.warn(
      'Failed to set monitoring user',
      { userId },
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * Clear user context when user logs out.
 */
export function clearMonitoringUser(): void {
  try {
    Sentry.setUser(null)

    const LogRocket = (window as any).LogRocket
    if (LogRocket) {
      LogRocket.logout()
    }

    log.debug('Monitoring user context cleared')
  } catch (error) {
    log.warn('Failed to clear monitoring user', undefined, error instanceof Error ? error : undefined)
  }
}

/**
 * Capture a custom event in monitoring systems.
 */
export function captureMonitoringEvent(
  eventName: string,
  data?: Record<string, any>
): void {
  try {
    Sentry.captureMessage(eventName, {
      level: 'info',
      contexts: {
        custom: data,
      },
    })

    const LogRocket = (window as any).LogRocket
    if (LogRocket) {
      LogRocket.captureException(new Error(eventName), { extra: data })
    }
  } catch (error) {
    log.debug('Failed to capture monitoring event', { eventName })
  }
}

/**
 * Add breadcrumb to monitoring context (useful for debugging user journeys).
 */
export function addMonitoringBreadcrumb(
  message: string,
  category: string = 'user-action',
  data?: Record<string, any>
): void {
  try {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    })

    const LogRocket = (window as any).LogRocket
    if (LogRocket) {
      LogRocket.captureMessage(message, {
        extra: data,
      })
    }
  } catch (error) {
    log.debug('Failed to add monitoring breadcrumb', { message })
  }
}

export { Sentry }
