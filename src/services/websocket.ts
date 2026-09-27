/* eslint-disable */
export type WSStatus = 'connecting' | 'open' | 'closed' | 'error' | 'reconnecting'

export type Handler = (payload: any) => void
export type StatusHandler = (status: WSStatus, details: ConnectionStatusDetails) => void

export interface ConnectionStatusDetails {
  status: WSStatus
  attempt: number
  maxAttempts: number
  nextRetryDelayMs: number | null
  queuedMessageCount: number
  isOnline: boolean
}

export interface QueuedMessage {
  id: string
  payload: any
  timestamp: number
  signature?: string
}

export interface WebSocketManagerOptions {
  reconnectInitialDelay?: number
  reconnectMaxDelay?: number
  reconnectMultiplier?: number
  maxReconnectAttempts?: number
  heartbeatIntervalMs?: number
  connectionTimeoutMs?: number
  enableJitter?: boolean
  autoReconnect?: boolean
  maxQueueSize?: number
  deduplicateQueue?: boolean
  persistQueue?: boolean
  onStatusChange?: StatusHandler
}

const STORAGE_QUEUE_KEY = 'stellar_nebula_ws_queue'

/**
 * Manages a WebSocket connection with automatic exponential-backoff reconnection,
 * connection status reporting, offline message queue with deduplication and persistence,
 * and pub/sub message routing.
 */
export class WebSocketManager {
  private url: string
  private ws: WebSocket | null = null
  private status: WSStatus = 'closed'
  private reconnectInitialDelay: number
  private reconnectMaxDelay: number
  private reconnectMultiplier: number
  private maxReconnectAttempts: number
  private enableJitter: boolean
  private autoReconnect: boolean
  private connectionTimeoutMs: number
  private deduplicateQueue: boolean
  private persistQueue: boolean
  private shouldReconnect = true
  private reconnectAttempt = 0
  private nextRetryDelayMs: number | null = null
  private reconnectTimer: any = null
  private connectionTimeoutTimer: any = null
  private heartbeatTimer: any = null
  private heartbeatIntervalMs: number
  private maxQueueSize: number
  private messageQueue: QueuedMessage[] = []
  private subscriptions = new Map<string, Set<Handler>>()
  private statusListeners = new Set<StatusHandler>()
  private activeAccountSubscriptions = new Set<string>()
  private activeContractSubscriptions = new Set<string>()
  private onStatusChangeOpt?: StatusHandler
  private isOnlineState: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private onlineListener: (() => void) | null = null
  private offlineListener: (() => void) | null = null

  constructor(url: string, opts: WebSocketManagerOptions = {}) {
    this.url = url
    this.reconnectInitialDelay = opts.reconnectInitialDelay ?? 1000
    this.reconnectMaxDelay = opts.reconnectMaxDelay ?? 30000
    this.reconnectMultiplier = opts.reconnectMultiplier ?? 1.8
    this.maxReconnectAttempts = opts.maxReconnectAttempts ?? Infinity
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 30000
    this.connectionTimeoutMs = opts.connectionTimeoutMs ?? 10000
    this.enableJitter = opts.enableJitter ?? true
    this.autoReconnect = opts.autoReconnect ?? true
    this.maxQueueSize = opts.maxQueueSize ?? 100
    this.deduplicateQueue = opts.deduplicateQueue ?? true
    this.persistQueue = opts.persistQueue ?? true
    this.onStatusChangeOpt = opts.onStatusChange

    this.loadPersistedQueue()
    this.setupNetworkListeners()
  }

  /** Open or restore the WebSocket connection. */
  connect() {
    this.shouldReconnect = true

    if (this.ws && (this.status === 'connecting' || this.status === 'open')) {
      return
    }

    this.clearReconnectTimer()
    this.cleanupWebSocket()

    this.setStatus('connecting')

    // Connection timeout to handle network throttling / dropped packets
    if (this.connectionTimeoutMs > 0) {
      this.clearConnectionTimeout()
      this.connectionTimeoutTimer = setTimeout(() => {
        if (this.status === 'connecting') {
          console.warn(`[WebSocket] Connection timed out after ${this.connectionTimeoutMs}ms`)
          this.cleanupWebSocket()
          this.setStatus('error')
          if (this.shouldReconnect && this.autoReconnect) {
            this.scheduleReconnect()
          }
        }
      }, this.connectionTimeoutMs)
    }

    try {
      const currentWs = new WebSocket(this.url)
      this.ws = currentWs

      currentWs.addEventListener('open', () => {
        if (this.ws !== currentWs) return
        this.clearConnectionTimeout()
        this.clearReconnectTimer()
        this.reconnectAttempt = 0
        this.nextRetryDelayMs = null
        this.setStatus('open')
        this.startHeartbeat()

        // 1. Restore subscriptions after reconnect
        this.resubscribeAll()

        // 2. Replay all queued messages after reconnect
        this.flushQueue()
      })

      currentWs.addEventListener('message', (ev) => {
        if (this.ws !== currentWs) return
        this.handleMessage(ev.data)
      })

      currentWs.addEventListener('close', () => {
        if (this.ws !== currentWs) return
        this.clearConnectionTimeout()
        this.stopHeartbeat()
        this.ws = null

        if (this.shouldReconnect && this.autoReconnect) {
          this.scheduleReconnect()
        } else {
          this.setStatus('closed')
        }
      })

      currentWs.addEventListener('error', (err) => {
        if (this.ws !== currentWs) return
        this.clearConnectionTimeout()
        this.stopHeartbeat()
        console.error('WebSocket error', err)
        this.setStatus('error')

        if (
          currentWs.readyState === WebSocket.OPEN ||
          currentWs.readyState === WebSocket.CONNECTING
        ) {
          try {
            currentWs.close()
          } catch {
            /* ignore */
          }
        } else if (this.shouldReconnect && this.autoReconnect && !this.reconnectTimer) {
          this.scheduleReconnect()
        }
      })
    } catch (err) {
      this.clearConnectionTimeout()
      console.error('Failed to instantiate WebSocket', err)
      this.setStatus('error')
      if (this.shouldReconnect && this.autoReconnect) {
        this.scheduleReconnect()
      }
    }
  }

  /**
   * Calculate exponential backoff delay with optional jitter.
   */
  private calculateBackoffDelay(attempt: number): number {
    const rawDelay = this.reconnectInitialDelay * Math.pow(this.reconnectMultiplier, attempt)
    const clamped = Math.min(this.reconnectMaxDelay, rawDelay)

    if (!this.enableJitter) {
      return Math.floor(clamped)
    }

    // Apply +/- 20% jitter within [0.8, 1.2] to avoid thundering herd
    const jitter = 0.8 + Math.random() * 0.4
    return Math.min(this.reconnectMaxDelay, Math.floor(clamped * jitter))
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || !this.autoReconnect) {
      this.setStatus('closed')
      return
    }

    if (this.reconnectTimer) {
      return
    }

    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.warn(`[WebSocket] Max reconnect attempts reached (${this.maxReconnectAttempts})`)
      this.nextRetryDelayMs = null
      this.setStatus('closed')
      return
    }

    const delay = this.calculateBackoffDelay(this.reconnectAttempt)
    this.reconnectAttempt += 1
    this.nextRetryDelayMs = delay

    this.setStatus('reconnecting', delay)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.nextRetryDelayMs = null
      this.connect()
    }, delay)
  }

  /** Force an immediate manual reconnection attempt. */
  reconnect() {
    this.clearReconnectTimer()
    this.clearConnectionTimeout()
    this.shouldReconnect = true
    this.cleanupWebSocket()
    this.connect()
  }

  private setStatus(newStatus: WSStatus, nextDelay: number | null = this.nextRetryDelayMs) {
    this.status = newStatus
    this.nextRetryDelayMs = nextDelay
    this.notifyStatusListeners()
  }

  private notifyStatusListeners() {
    const details = this.getStatusDetails()

    if (this.onStatusChangeOpt) {
      try {
        this.onStatusChangeOpt(this.status, details)
      } catch (err) {
        console.error('WebSocket onStatusChange callback error', err)
      }
    }

    for (const listener of Array.from(this.statusListeners)) {
      try {
        listener(this.status, details)
      } catch (err) {
        console.error('WebSocket status listener error', err)
      }
    }

    this.publish('status', details)
    this.publish('connection:status', details)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.status === 'open' && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }))
        } catch {
          /* ignore */
        }
      }
    }, this.heartbeatIntervalMs)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.nextRetryDelayMs = null
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer)
      this.connectionTimeoutTimer = null
    }
  }

  private cleanupWebSocket() {
    if (this.ws) {
      const oldWs = this.ws
      this.ws = null
      try {
        if (oldWs.readyState === WebSocket.OPEN || oldWs.readyState === WebSocket.CONNECTING) {
          oldWs.close()
        }
      } catch {
        /* ignore */
      }
    }
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return

    this.onlineListener = () => {
      this.isOnlineState = true
      this.notifyStatusListeners()
      if (
        this.shouldReconnect &&
        this.autoReconnect &&
        (this.status === 'closed' || this.status === 'error' || this.status === 'reconnecting')
      ) {
        this.clearReconnectTimer()
        this.connect()
      }
    }

    this.offlineListener = () => {
      this.isOnlineState = false
      this.notifyStatusListeners()
    }

    window.addEventListener('online', this.onlineListener)
    window.addEventListener('offline', this.offlineListener)
  }

  private removeNetworkListeners() {
    if (typeof window === 'undefined') return
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener)
      this.onlineListener = null
    }
    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener)
      this.offlineListener = null
    }
  }

  private handleMessage(raw: any) {
    let data: any = raw
    try {
      data = typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      /* ignore */
    }
    const type = data?.type ?? 'message'
    this.publish(type, data)
    this.publish('*', data)
  }

  private publish(event: string, payload: any) {
    const set = this.subscriptions.get(event)
    if (!set) return
    for (const h of Array.from(set)) {
      try {
        h(payload)
      } catch (e) {
        console.error('WebSocket handler error', e)
      }
    }
  }

  /**
   * Subscribe to messages of a specific event type.
   * Returns an unsubscribe function.
   */
  subscribe(event: string, handler: Handler) {
    if (!this.subscriptions.has(event)) this.subscriptions.set(event, new Set())
    this.subscriptions.get(event)!.add(handler)
    return () => this.unsubscribe(event, handler)
  }

  /** Remove a previously subscribed handler. */
  unsubscribe(event: string, handler: Handler) {
    const set = this.subscriptions.get(event)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) this.subscriptions.delete(event)
  }

  /** Subscribe to status change events. */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusListeners.add(handler)
    try {
      handler(this.status, this.getStatusDetails())
    } catch (err) {
      console.error('WebSocket onStatusChange immediate call error', err)
    }
    return () => {
      this.statusListeners.delete(handler)
    }
  }

  /** Subscribe to account-specific updates from the server. */
  subscribeToAccount(accountId: string) {
    this.activeAccountSubscriptions.add(accountId)
    this.send({ action: 'subscribe', topic: 'account', account: accountId })
  }

  /** Unsubscribe from account-specific updates. */
  unsubscribeFromAccount(accountId: string) {
    this.activeAccountSubscriptions.delete(accountId)
    this.send({ action: 'unsubscribe', topic: 'account', account: accountId })
  }

  /** Subscribe to contract-specific events from the server. */
  subscribeToContract(contractId: string) {
    this.activeContractSubscriptions.add(contractId)
    this.send({ action: 'subscribe', topic: 'contract', contract: contractId })
  }

  /** Unsubscribe from contract-specific updates. */
  unsubscribeFromContract(contractId: string) {
    this.activeContractSubscriptions.delete(contractId)
    this.send({ action: 'unsubscribe', topic: 'contract', contract: contractId })
  }

  /** Resubscribe all active topics and targets upon reconnection. */
  private resubscribeAll() {
    for (const accountId of this.activeAccountSubscriptions) {
      try {
        this.send(
          { action: 'subscribe', topic: 'account', account: accountId },
          { queueIfOffline: false }
        )
      } catch (e) {
        console.error('Resubscribe account failed', e)
      }
    }
    for (const contractId of this.activeContractSubscriptions) {
      try {
        this.send(
          { action: 'subscribe', topic: 'contract', contract: contractId },
          { queueIfOffline: false }
        )
      } catch (e) {
        console.error('Resubscribe contract failed', e)
      }
    }
  }

  /**
   * Send a raw or JSON-serializable message over the socket.
   * If connection is not open, automatically queues the message for replay
   * with deduplication unless `queueIfOffline: false` is passed.
   */
  send(obj: any, options: { queueIfOffline?: boolean; deduplicate?: boolean } = {}) {
    const queueIfOffline = options.queueIfOffline ?? true
    const shouldDeduplicate = options.deduplicate ?? this.deduplicateQueue

    if (this.ws && this.status === 'open' && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj))
        return
      } catch (e) {
        console.error('send failed', e)
        if (!queueIfOffline) return
      }
    }

    if (queueIfOffline) {
      const signature = typeof obj === 'string' ? obj : JSON.stringify(obj)

      if (shouldDeduplicate) {
        const existingIndex = this.messageQueue.findIndex((m) => m.signature === signature)
        if (existingIndex !== -1) {
          // Update timestamp of existing queued message
          this.messageQueue[existingIndex].timestamp = Date.now()
          this.savePersistedQueue()
          return
        }
      }

      if (this.messageQueue.length >= this.maxQueueSize) {
        this.messageQueue.shift()
      }

      this.messageQueue.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        payload: obj,
        timestamp: Date.now(),
        signature,
      })

      this.savePersistedQueue()
      this.notifyStatusListeners()
    }
  }

  /** Replay and flush queued messages once connection is re-established. */
  private flushQueue() {
    if (this.messageQueue.length === 0 || this.status !== 'open' || !this.ws) {
      return
    }

    const messagesToReplay = [...this.messageQueue]
    this.messageQueue = []
    let replayedCount = 0

    for (const msg of messagesToReplay) {
      try {
        this.ws.send(typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload))
        replayedCount++
      } catch (err) {
        console.error('Failed to replay message during reconnection', err)
        this.messageQueue = [
          msg,
          ...messagesToReplay.slice(replayedCount + 1),
          ...this.messageQueue,
        ]
        break
      }
    }

    this.savePersistedQueue()
    this.notifyStatusListeners()
    this.publish('replayed', { count: replayedCount })
  }

  /** Persist offline queue to local/IndexedDB storage for page reloads. */
  private savePersistedQueue() {
    if (!this.persistQueue || typeof window === 'undefined') return
    try {
      if (typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(this.messageQueue))
      }
    } catch {
      /* ignore storage quotas */
    }
  }

  /** Load previously persisted queue from local storage. */
  private loadPersistedQueue() {
    if (!this.persistQueue || typeof window === 'undefined') return
    try {
      if (typeof window.localStorage !== 'undefined') {
        const stored = window.localStorage.getItem(STORAGE_QUEUE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            this.messageQueue = parsed.slice(-this.maxQueueSize)
          }
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
  }

  /** Close the connection permanently (no reconnect). */
  close() {
    this.shouldReconnect = false
    this.clearReconnectTimer()
    this.clearConnectionTimeout()
    this.stopHeartbeat()
    this.cleanupWebSocket()
    this.removeNetworkListeners()
    this.setStatus('closed')
  }

  /** Alias for close(). */
  disconnect() {
    this.close()
  }

  /** Get the current connection status. */
  getStatus(): WSStatus {
    return this.status
  }

  /** Get detailed connection state including reconnect attempts, countdown, and queued messages. */
  getStatusDetails(): ConnectionStatusDetails {
    const isOnline =
      this.isOnlineState && (typeof navigator !== 'undefined' ? navigator.onLine : true)
    return {
      status: this.status,
      attempt: this.reconnectAttempt,
      maxAttempts: this.maxReconnectAttempts,
      nextRetryDelayMs: this.nextRetryDelayMs,
      queuedMessageCount: this.messageQueue.length,
      isOnline,
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempt
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length
  }

  getQueue(): QueuedMessage[] {
    return [...this.messageQueue]
  }

  clearQueue(): void {
    this.messageQueue = []
    this.savePersistedQueue()
    this.notifyStatusListeners()
  }

  isConnected(): boolean {
    return this.status === 'open'
  }

  isReconnecting(): boolean {
    return this.status === 'reconnecting'
  }
}

// ── Shared Singleton & Factory ────────────────────────────────────────────────

let defaultWebSocketManager: WebSocketManager | null = null

export function getWebSocketManager(
  url?: string,
  opts?: WebSocketManagerOptions
): WebSocketManager {
  if (!defaultWebSocketManager) {
    const defaultUrl =
      url ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
        : 'ws://localhost:3000/ws')
    defaultWebSocketManager = new WebSocketManager(defaultUrl, opts)
  }
  return defaultWebSocketManager
}

export function setWebSocketManager(manager: WebSocketManager | null): void {
  defaultWebSocketManager = manager
}

export default WebSocketManager
