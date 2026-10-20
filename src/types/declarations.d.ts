/**
 * Ambient types for globals that third-party scripts attach to `window`.
 * LogRocket is loaded from a CDN (see utils/sri.ts), so the app has no package
 * to import its types from. This file has no imports or exports, so the
 * `Window` interface below merges into the global one.
 */

/** The subset of the LogRocket browser API the app calls (services/monitoring.ts). */
interface LogRocketClient {
  init(appId: string, options?: Record<string, unknown>): void
  identify(userId: string, traits?: Record<string, unknown>): void
  logout(): void
  getSessionURL(callback: (sessionURL: string) => void): void
  captureException(error: Error, options?: { extra?: Record<string, unknown> }): void
  captureMessage(message: string, options?: { extra?: Record<string, unknown> }): void
}

interface Window {
  LogRocket?: LogRocketClient
}
