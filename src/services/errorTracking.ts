import * as Sentry from '@sentry/react'
import { createScopedLogger } from './logging'

const log = createScopedLogger('ErrorTracking')

export interface ErrorTrackingConfig {
  dsn: string
  environment: string
  release?: string
  tracesSampleRate?: number
  replaysSessionSampleRate?: number
  replaysOnErrorSampleRate?: number
}

export function initErrorTracking(config: ErrorTrackingConfig): void {
  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: config.tracesSampleRate ?? 0.1,
      replaysSessionSampleRate: config.replaysSessionSampleRate ?? 0,
      replaysOnErrorSampleRate: config.replaysOnErrorSampleRate ?? 1.0,
    })

    log.info('Error tracking initialized', {
      environment: config.environment,
      release: config.release || 'unknown',
    })
  } catch (error) {
    log.error(
      'Failed to initialize error tracking',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

export function setSentryUser(publicKey: string | null): void {
  if (publicKey) {
    Sentry.setUser({ id: publicKey })
    log.debug('Sentry user set', { userId: publicKey })
  } else {
    Sentry.setUser(null)
    log.debug('Sentry user cleared')
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context)
    }
    if (error instanceof Error) {
      log.error('Error captured', error, context)
      Sentry.captureException(error)
    } else {
      log.error('Non-standard error captured', new Error(String(error)), context)
      Sentry.captureException(new Error(String(error)))
    }
  })
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'error'): void {
  Sentry.captureMessage(message, level)
}

export function getSentryReportDialogUrl(eventId: string): string {
  return `https://o${eventId}/ingest/`
}

export { Sentry }
