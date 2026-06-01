export type AnalyticsEventName =
  | 'scan_started'
  | 'scan_completed'
  | 'upgrade_started'
  | 'upgrade_confirmed'
  | 'upgrade_failed'
  | 'error_reported'
  | 'performance_metric'

export interface AnalyticsEventPayload {
  [key: string]: string | number | boolean | null | undefined
}

export interface AnalyticsEvent {
  id: string
  name: AnalyticsEventName
  payload: AnalyticsEventPayload
  timestamp: string
}

export interface AnalyticsConfig {
  enabled: boolean
  endpoint: string | null
  batchSize: number
  flushIntervalMs: number
}

const ANALYTICS_OPT_OUT_KEY = 'stellar-nebula:analytics-opt-out'
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  endpoint: null,
  batchSize: 10,
  flushIntervalMs: 15_000,
}

const piiKeyPattern = /address|account|email|handle|name|publickey|secret|token|wallet/i

function createEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `analytics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readOptOut(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === 'true'
  } catch {
    return false
  }
}

function writeOptOut(value: boolean): void {
  try {
    localStorage.setItem(ANALYTICS_OPT_OUT_KEY, String(value))
  } catch {
    // Analytics preference should never break gameplay.
  }
}

export function sanitizeAnalyticsPayload(
  payload: AnalyticsEventPayload = {}
): AnalyticsEventPayload {
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      if (piiKeyPattern.test(key)) return false
      return ['string', 'number', 'boolean', 'undefined'].includes(typeof value) || value === null
    })
  )
}

export class AnalyticsTracker {
  private config: AnalyticsConfig
  private queue: AnalyticsEvent[] = []
  private flushTimer: number | null = null

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  configure(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config }
    this.scheduleFlush()
  }

  isEnabled(): boolean {
    return this.config.enabled && !readOptOut()
  }

  setOptOut(optOut: boolean): void {
    writeOptOut(optOut)
    if (optOut) {
      this.queue = []
      this.clearFlushTimer()
    }
  }

  hasOptedOut(): boolean {
    return readOptOut()
  }

  track(name: AnalyticsEventName, payload: AnalyticsEventPayload = {}): AnalyticsEvent | null {
    if (!this.isEnabled()) return null

    const event: AnalyticsEvent = {
      id: createEventId(),
      name,
      payload: sanitizeAnalyticsPayload(payload),
      timestamp: new Date().toISOString(),
    }

    this.queue = [...this.queue, event]

    if (this.queue.length >= this.config.batchSize) {
      void this.flush()
    } else {
      this.scheduleFlush()
    }

    return event
  }

  getQueue(): readonly AnalyticsEvent[] {
    return [...this.queue]
  }

  async flush(): Promise<AnalyticsEvent[]> {
    if (!this.isEnabled() || this.queue.length === 0) return []

    const batch = this.queue
    this.queue = []
    this.clearFlushTimer()

    if (!this.config.endpoint) {
      return batch
    }

    try {
      const body = JSON.stringify({ events: batch })
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const sent = navigator.sendBeacon(this.config.endpoint, body)
        if (sent) return batch
      }

      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      })
      return batch
    } catch {
      this.queue = [...batch, ...this.queue]
      this.scheduleFlush()
      return []
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null || !this.isEnabled() || this.queue.length === 0) return

    this.flushTimer = window.setTimeout(() => {
      void this.flush()
    }, this.config.flushIntervalMs)
  }

  private clearFlushTimer(): void {
    if (this.flushTimer === null) return

    window.clearTimeout(this.flushTimer)
    this.flushTimer = null
  }
}

export const analytics = new AnalyticsTracker()

export function trackEvent(
  name: AnalyticsEventName,
  payload?: AnalyticsEventPayload
): AnalyticsEvent | null {
  return analytics.track(name, payload)
}

export { ANALYTICS_OPT_OUT_KEY }
