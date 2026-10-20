/* eslint-disable */
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

import { getSentry } from './sentryClient'
import { createScopedLogger } from './logging'
import {
  isStellarNetworkUrl,
  redactStellarKeysInText,
  redactWalletAddress,
  sanitizeMonitoringData,
} from '@/utils/sanitization'

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
export async function initializeMonitoring(config: MonitoringConfig): Promise<void> {
  if (monitoringInitialized) {
    log.warn('Monitoring already initialized, skipping duplicate initialization')
    return
  }

  try {
    // Initialize Sentry first if DSN is provided. Awaited so LogRocket (below)
    // can safely assume the Sentry chunk has loaded before it tries to use it.
    if (config.sentryDsn) {
      await initializeSentry(config)
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
      {
        sentryConfigured: Boolean(config.sentryDsn),
        sentryEnvironment: config.sentryEnvironment,
        logRocketConfigured: Boolean(config.logRocketAppId),
      }
    )
  }
}

/**
 * Initialize Sentry for error tracking, performance monitoring, and replays.
 *
 * `@sentry/react` is loaded via a dynamic import (see `./sentryClient`) so it
 * is fetched and parsed in its own chunk, off the critical rendering path,
 * instead of blocking first paint as a synchronous top-level import would.
 */
async function initializeSentry(config: MonitoringConfig): Promise<void> {
  try {
    const Sentry = await getSentry()
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
      beforeBreadcrumb(breadcrumb) {
        // Issue #486: redact wallet addresses and amounts before they are stored
        return sanitizeMonitoringData(breadcrumb) as typeof breadcrumb
      },
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
        // Issue #486: final pass over structured payloads and the request URL
        if (event.extra) event.extra = sanitizeMonitoringData(event.extra) as typeof event.extra
        if (event.contexts) {
          event.contexts = sanitizeMonitoringData(event.contexts) as typeof event.contexts
        }
        if (event.request?.url) event.request.url = redactStellarKeysInText(event.request.url)
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

/** Network request or response as LogRocket passes it to its sanitizers. */
interface LogRocketNetworkRecord {
  url: string
  body?: unknown
  headers?: Record<string, string>
}

/**
 * Initialize LogRocket for advanced session replay and user analytics.
 * LogRocket captures user interactions, console logs, network activity, and DOM changes.
 */
function initializeLogRocket(appId: string): void {
  try {
    // Dynamically import LogRocket to avoid bundle bloat if not needed
    const LogRocket = window.LogRocket

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
      // Issue #486: do not store the viewer's IP address alongside sessions
      shouldCaptureIP: false,
      network: {
        // Capture all network requests
        requestSanitizer: (request: LogRocketNetworkRecord) => {
          // Remove sensitive headers
          if (request.headers) {
            delete request.headers['Authorization']
            delete request.headers['X-API-Key']
            delete request.headers['Cookie']
          }
          // Wallet addresses appear in Horizon paths such as /accounts/G...
          if (typeof request.url === 'string') {
            request.url = redactStellarKeysInText(request.url)
          }
          if (typeof request.body === 'string') {
            request.body = redactStellarKeysInText(request.body)
          }
          return request
        },
        responseSanitizer: (response: LogRocketNetworkRecord) => {
          // Horizon and RPC responses contain balances and transaction details: drop them
          if (isStellarNetworkUrl(response.url)) {
            response.body = '[REDACTED]'
          } else if (typeof response.body === 'string') {
            response.body = redactStellarKeysInText(response.body)
          }
          return response
        },
      },
      dom: {
        // Capture DOM changes
        inputSanitizer: true,
        // Mask all rendered text so balances and addresses are not replayed
        textSanitizer: true,
      },
    })

    // Connect Sentry with LogRocket for unified error tracking
    if (monitoringInitialized) {
      LogRocket.getSessionURL((sessionURL: string) => {
        getSentry().then((Sentry) => {
          Sentry.captureMessage('LogRocket Session', {
            level: 'info',
            contexts: {
              replay: {
                url: sessionURL,
              },
            },
          })
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
    // Issue #486: the user ID is a wallet public key, so only a shortened form is sent
    const safeUserId = redactWalletAddress(userId)

    // Set Sentry user
    getSentry().then((Sentry) =>
      Sentry.setUser({
        id: safeUserId,
        email,
        username,
      })
    )

    // Set LogRocket user if available
    const LogRocket = window.LogRocket
    if (LogRocket) {
      LogRocket.identify(safeUserId, {
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
    getSentry().then((Sentry) => Sentry.setUser(null))

    const LogRocket = window.LogRocket
    if (LogRocket) {
      LogRocket.logout()
    }

    log.debug('Monitoring user context cleared')
  } catch (error) {
    log.warn(
      'Failed to clear monitoring user',
      undefined,
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * Capture a custom event in monitoring systems.
 */
export function captureMonitoringEvent(eventName: string, data?: Record<string, unknown>): void {
  try {
    const safeData = data ? (sanitizeMonitoringData(data) as Record<string, unknown>) : undefined

    getSentry().then((Sentry) =>
      Sentry.captureMessage(eventName, {
        level: 'info',
        contexts: {
          custom: safeData,
        },
      })
    )

    const LogRocket = window.LogRocket
    if (LogRocket) {
      LogRocket.captureException(new Error(eventName), { extra: safeData })
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
  data?: Record<string, unknown>
): void {
  try {
    // Issue #486: redact wallet addresses, secrets and amounts before they leave the app
    const safeMessage = redactStellarKeysInText(message)
    const safeData = data ? (sanitizeMonitoringData(data) as Record<string, unknown>) : undefined

    getSentry().then((Sentry) =>
      Sentry.addBreadcrumb({
        message: safeMessage,
        category,
        data: safeData,
        level: 'info',
      })
    )

    const LogRocket = window.LogRocket
    if (LogRocket) {
      LogRocket.captureMessage(safeMessage, {
        extra: safeData,
      })
    }
  } catch (error) {
    log.debug('Failed to add monitoring breadcrumb', { message })
  }
}

export interface WebVitalMetric {
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  id?: string
  delta?: number
  navigationType?: string
}

/**
 * Report Web Vitals metrics to Sentry and real user monitoring pipelines.
 */
export function trackWebVital(metric: WebVitalMetric): void {
  try {
    const roundedValue =
      metric.name === 'CLS' ? Number(metric.value.toFixed(4)) : Math.round(metric.value)

    log.info(`[Web Vital] ${metric.name}: ${roundedValue} (${metric.rating})`, {
      metric: metric.name,
      value: roundedValue,
      rating: metric.rating,
      id: metric.id,
    })

    // Sentry measurements & tags for performance dashboard
    getSentry().then((Sentry) => {
      const measurable = Sentry as typeof Sentry & {
        setMeasurement?: (name: string, value: number, unit: string) => void
      }
      if (typeof measurable.setMeasurement === 'function') {
        measurable.setMeasurement(
          metric.name,
          roundedValue,
          metric.name === 'CLS' ? '' : 'millisecond'
        )
      }

      Sentry.setTag(`vital.${metric.name.toLowerCase()}`, metric.rating)
      Sentry.setExtra(`vital.${metric.name.toLowerCase()}_value`, roundedValue)

      // Capture breadcrumb for diagnostics
      Sentry.addBreadcrumb({
        category: 'web-vital',
        message: `${metric.name}: ${roundedValue} (${metric.rating})`,
        level: metric.rating === 'poor' ? 'warning' : 'info',
        data: {
          metric: metric.name,
          value: roundedValue,
          rating: metric.rating,
          id: metric.id,
        },
      })

      // Alert for regressions if metric is poor
      if (metric.rating === 'poor') {
        Sentry.captureMessage(`[Performance Alert] Poor ${metric.name}: ${roundedValue}`, {
          level: 'warning',
          tags: {
            regression_type: 'web-vital',
            metric: metric.name,
          },
          contexts: {
            web_vital: {
              name: metric.name,
              value: roundedValue,
              rating: metric.rating,
              id: metric.id,
            },
          },
        })
      }
    })

    // LogRocket custom event
    const LogRocket = window.LogRocket
    if (LogRocket && typeof LogRocket.track === 'function') {
      LogRocket.track('Web Vital Recorded', {
        metric: metric.name,
        value: roundedValue,
        rating: metric.rating,
      })
    }
  } catch (error) {
    log.debug('Failed to record web vital', {
      error: error instanceof Error ? error.message : String(error),
      metric: metric.name,
    })
  }
}

export { getSentry }
