/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketManager, type WSStatus } from '../websocket'

// ── Mock WebSocket Implementation ─────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static shouldFailConstructor = false

  url: string
  readyState: number = WebSocket.CONNECTING
  sentData: string[] = []
  listeners: Record<string, ((event: any) => void)[]> = {}

  constructor(url: string) {
    if (MockWebSocket.shouldFailConstructor) {
      throw new Error('Failed to connect to network')
    }
    this.url = url
    MockWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = []
    this.listeners[type].push(listener)
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener)
    }
  }

  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    this.sentData.push(data)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.emit('close', { wasClean: true })
  }

  emit(type: string, event: any = {}) {
    if (type === 'open') {
      this.readyState = WebSocket.OPEN
    } else if (type === 'close') {
      this.readyState = WebSocket.CLOSED
    }
    const handlers = this.listeners[type] || []
    for (const h of handlers) {
      h(event)
    }
  }
}

describe('WebSocketManager', () => {
  let originalWebSocket: any

  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    MockWebSocket.shouldFailConstructor = false
    originalWebSocket = globalThis.WebSocket
    globalThis.WebSocket = MockWebSocket as any
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    globalThis.WebSocket = originalWebSocket
  })

  // ── 1. Connection & Heartbeat ──────────────────────────────────────────────

  describe('Connection & Lifecycle', () => {
    it('initializes in closed state and connects successfully', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', { enableJitter: false })
      expect(ws.getStatus()).toBe('closed')

      ws.connect()
      expect(ws.getStatus()).toBe('connecting')
      expect(MockWebSocket.instances.length).toBe(1)

      const socket = MockWebSocket.instances[0]
      socket.emit('open')

      expect(ws.getStatus()).toBe('open')
      expect(ws.isConnected()).toBe(true)
      expect(ws.isReconnecting()).toBe(false)
      ws.close()
    })

    it('sends heartbeat ping periodically when open', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        heartbeatIntervalMs: 5000,
        enableJitter: false,
      })
      ws.connect()
      const socket = MockWebSocket.instances[0]
      socket.emit('open')

      vi.advanceTimersByTime(5000)
      expect(socket.sentData.length).toBe(1)
      const ping = JSON.parse(socket.sentData[0])
      expect(ping.type).toBe('ping')

      vi.advanceTimersByTime(5000)
      expect(socket.sentData.length).toBe(2)

      ws.close()
    })

    it('routes incoming messages to pub/sub handlers', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', { enableJitter: false })
      ws.connect()
      const socket = MockWebSocket.instances[0]
      socket.emit('open')

      const scanHandler = vi.fn()
      const wildcardHandler = vi.fn()

      const unsubScan = ws.subscribe('scan_result', scanHandler)
      const unsubWildcard = ws.subscribe('*', wildcardHandler)

      socket.emit('message', { data: JSON.stringify({ type: 'scan_result', id: 'nebula-42' }) })

      expect(scanHandler).toHaveBeenCalledWith({ type: 'scan_result', id: 'nebula-42' })
      expect(wildcardHandler).toHaveBeenCalledWith({ type: 'scan_result', id: 'nebula-42' })

      unsubScan()
      socket.emit('message', { data: JSON.stringify({ type: 'scan_result', id: 'nebula-43' }) })
      expect(scanHandler).toHaveBeenCalledTimes(1)
      expect(wildcardHandler).toHaveBeenCalledTimes(2)

      unsubWildcard()
      ws.close()
    })
  })

  // ── 2. Exponential Backoff Reconnection ────────────────────────────────────

  describe('Exponential Backoff Reconnection', () => {
    it('automatically schedules reconnection on unexpected close with exponential backoff', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 1000,
        reconnectMultiplier: 2,
        reconnectMaxDelay: 10000,
        enableJitter: false,
      })

      ws.connect()
      expect(MockWebSocket.instances.length).toBe(1)
      const socket1 = MockWebSocket.instances[0]
      socket1.emit('open')
      expect(ws.getStatus()).toBe('open')

      // Connection dropped
      socket1.emit('close')
      expect(ws.getStatus()).toBe('reconnecting')
      expect(ws.isReconnecting()).toBe(true)
      expect(ws.getReconnectAttempts()).toBe(1)
      expect(ws.getStatusDetails().nextRetryDelayMs).toBe(1000)

      // Advance by 999ms - reconnect not called yet
      vi.advanceTimersByTime(999)
      expect(MockWebSocket.instances.length).toBe(1)

      // Advance to 1000ms - first retry occurs
      vi.advanceTimersByTime(1)
      expect(MockWebSocket.instances.length).toBe(2)
      expect(ws.getStatus()).toBe('connecting')

      // Second connection fails
      const socket2 = MockWebSocket.instances[1]
      socket2.emit('close')

      expect(ws.getStatus()).toBe('reconnecting')
      expect(ws.getReconnectAttempts()).toBe(2)
      // Exponential delay: 1000 * 2^1 = 2000ms
      expect(ws.getStatusDetails().nextRetryDelayMs).toBe(2000)

      vi.advanceTimersByTime(2000)
      expect(MockWebSocket.instances.length).toBe(3)

      // Third connection fails
      const socket3 = MockWebSocket.instances[2]
      socket3.emit('close')

      // Exponential delay: 1000 * 2^2 = 4000ms
      expect(ws.getStatusDetails().nextRetryDelayMs).toBe(4000)

      ws.close()
    })

    it('respects reconnectMaxDelay cap', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 1000,
        reconnectMultiplier: 2,
        reconnectMaxDelay: 3000,
        enableJitter: false,
      })

      ws.connect()
      MockWebSocket.instances[0].emit('open')
      MockWebSocket.instances[0].emit('close') // attempt 1: 1000ms

      vi.advanceTimersByTime(1000)
      MockWebSocket.instances[1].emit('close') // attempt 2: 2000ms

      vi.advanceTimersByTime(2000)
      MockWebSocket.instances[2].emit('close') // attempt 3: 4000ms capped to 3000ms

      expect(ws.getStatusDetails().nextRetryDelayMs).toBe(3000)

      vi.advanceTimersByTime(3000)
      MockWebSocket.instances[3].emit('close') // attempt 4: still capped to 3000ms
      expect(ws.getStatusDetails().nextRetryDelayMs).toBe(3000)

      ws.close()
    })

    it('respects maxReconnectAttempts limit', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 100,
        reconnectMultiplier: 1.5,
        maxReconnectAttempts: 2,
        enableJitter: false,
      })

      ws.connect()
      MockWebSocket.instances[0].emit('open')
      MockWebSocket.instances[0].emit('close') // attempt 1

      vi.advanceTimersByTime(100)
      MockWebSocket.instances[1].emit('close') // attempt 2

      vi.advanceTimersByTime(150)
      MockWebSocket.instances[2].emit('close') // attempt 3 > maxReconnectAttempts (2)

      expect(ws.getStatus()).toBe('closed')
      expect(ws.isReconnecting()).toBe(false)
      ws.close()
    })

    it('resets reconnect attempts upon successful connection', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 500,
        enableJitter: false,
      })

      ws.connect()
      MockWebSocket.instances[0].emit('close')
      expect(ws.getReconnectAttempts()).toBe(1)

      vi.advanceTimersByTime(500)
      expect(MockWebSocket.instances.length).toBe(2)
      MockWebSocket.instances[1].emit('open')

      expect(ws.getStatus()).toBe('open')
      expect(ws.getReconnectAttempts()).toBe(0)
      ws.close()
    })

    it('allows immediate manual reconnection via reconnect()', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 10000,
        enableJitter: false,
      })

      ws.connect()
      MockWebSocket.instances[0].emit('close')
      expect(ws.getStatus()).toBe('reconnecting')
      expect(MockWebSocket.instances.length).toBe(1)

      // Manual retry before timer expires
      ws.reconnect()
      expect(MockWebSocket.instances.length).toBe(2)
      expect(ws.getStatus()).toBe('connecting')
      ws.close()
    })

    it('stops reconnection when close() or disconnect() is called', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 500,
        enableJitter: false,
      })

      ws.connect()
      MockWebSocket.instances[0].emit('close')
      expect(ws.getStatus()).toBe('reconnecting')

      ws.disconnect()
      expect(ws.getStatus()).toBe('closed')

      vi.advanceTimersByTime(10000)
      expect(MockWebSocket.instances.length).toBe(1)
    })
  })

  // ── 3. Event Replay After Reconnect ────────────────────────────────────────

  describe('Event Replay After Reconnect', () => {
    it('queues messages sent while disconnected and replays them upon reconnection', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 500,
        enableJitter: false,
      })

      ws.connect()
      const socket1 = MockWebSocket.instances[0]
      socket1.emit('open')

      // Send message while open -> sent immediately
      ws.send({ action: 'ping_test' })
      expect(socket1.sentData.length).toBe(1)

      // Connection drops
      socket1.emit('close')
      expect(ws.getStatus()).toBe('reconnecting')

      // Send messages while offline / reconnecting
      ws.send({ action: 'command_1', val: 100 })
      ws.send({ action: 'command_2', val: 200 })

      expect(ws.getQueuedMessageCount()).toBe(2)
      expect(ws.getStatusDetails().queuedMessageCount).toBe(2)

      const replayedSpy = vi.fn()
      ws.subscribe('replayed', replayedSpy)

      // Advance timer for reconnection
      vi.advanceTimersByTime(500)
      expect(MockWebSocket.instances.length).toBe(2)
      const socket2 = MockWebSocket.instances[1]

      // Socket reconnects
      socket2.emit('open')

      // Queued messages should have been flushed in FIFO order
      expect(socket2.sentData.length).toBe(2)
      expect(JSON.parse(socket2.sentData[0])).toEqual({ action: 'command_1', val: 100 })
      expect(JSON.parse(socket2.sentData[1])).toEqual({ action: 'command_2', val: 200 })

      expect(ws.getQueuedMessageCount()).toBe(0)
      expect(replayedSpy).toHaveBeenCalledWith({ count: 2 })

      ws.close()
    })

    it('enforces maxQueueSize by dropping oldest messages', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        maxQueueSize: 2,
        enableJitter: false,
      })

      // Send messages when not open
      ws.send({ id: 1 })
      ws.send({ id: 2 })
      ws.send({ id: 3 }) // Exceeds capacity 2, drops id: 1

      expect(ws.getQueuedMessageCount()).toBe(2)
      const queue = ws.getQueue()
      expect(queue.map((m) => m.payload)).toEqual([{ id: 2 }, { id: 3 }])

      ws.clearQueue()
      expect(ws.getQueuedMessageCount()).toBe(0)
      ws.close()
    })

    it('automatically resubscribes to active accounts and contracts upon reconnect', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 500,
        enableJitter: false,
      })

      ws.connect()
      const socket1 = MockWebSocket.instances[0]
      socket1.emit('open')

      ws.subscribeToAccount('GBB456ACCOUNT')
      ws.subscribeToContract('CAAA123CONTRACT')

      expect(socket1.sentData.length).toBe(2)
      expect(JSON.parse(socket1.sentData[0])).toEqual({
        action: 'subscribe',
        topic: 'account',
        account: 'GBB456ACCOUNT',
      })
      expect(JSON.parse(socket1.sentData[1])).toEqual({
        action: 'subscribe',
        topic: 'contract',
        contract: 'CAAA123CONTRACT',
      })

      // Connection drops
      socket1.emit('close')

      // Reconnects
      vi.advanceTimersByTime(500)
      const socket2 = MockWebSocket.instances[1]
      socket2.emit('open')

      // Active subscriptions should have been re-sent automatically
      expect(socket2.sentData.length).toBe(2)
      expect(JSON.parse(socket2.sentData[0])).toEqual({
        action: 'subscribe',
        topic: 'account',
        account: 'GBB456ACCOUNT',
      })
      expect(JSON.parse(socket2.sentData[1])).toEqual({
        action: 'subscribe',
        topic: 'contract',
        contract: 'CAAA123CONTRACT',
      })

      // Unsubscribing removes them from future re-subscriptions
      ws.unsubscribeFromAccount('GBB456ACCOUNT')
      socket2.emit('close')

      vi.advanceTimersByTime(500 * 1.8)
      const socket3 = MockWebSocket.instances[2]
      socket3.emit('open')

      // Only contract should be resubscribed
      expect(socket3.sentData.length).toBe(1)
      expect(JSON.parse(socket3.sentData[0])).toEqual({
        action: 'subscribe',
        topic: 'contract',
        contract: 'CAAA123CONTRACT',
      })

      ws.close()
    })
  })

  // ── 4. Network Throttling & Offline Scenarios ───────────────────────────────

  describe('Network Throttling and Offline Scenarios', () => {
    it('times out and retries when network throttling hangs connection in connecting state', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        connectionTimeoutMs: 3000,
        reconnectInitialDelay: 1000,
        enableJitter: false,
      })

      ws.connect()
      expect(ws.getStatus()).toBe('connecting')
      expect(MockWebSocket.instances.length).toBe(1)

      // Connection hangs due to severe network throttling (SYN packet drop)
      vi.advanceTimersByTime(3000)

      // Connection timeout fires, sets status to error and schedules backoff
      expect(ws.getStatus()).toBe('reconnecting')
      expect(ws.getReconnectAttempts()).toBe(1)

      // Backoff delay advances and triggers next attempt
      vi.advanceTimersByTime(1000)
      expect(MockWebSocket.instances.length).toBe(2)
      expect(ws.getStatus()).toBe('connecting')

      // Second attempt succeeds
      MockWebSocket.instances[1].emit('open')
      expect(ws.getStatus()).toBe('open')

      ws.close()
    })

    it('immediately triggers reconnection when window fires online event', () => {
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 30000, // Long delay
        enableJitter: false,
      })

      ws.connect()
      const socket1 = MockWebSocket.instances[0]
      socket1.emit('open')
      socket1.emit('close')

      expect(ws.getStatus()).toBe('reconnecting')
      expect(MockWebSocket.instances.length).toBe(1)

      // User's device comes back online: online event fires
      window.dispatchEvent(new Event('online'))

      // Should immediately initiate reconnect without waiting 30 seconds
      expect(MockWebSocket.instances.length).toBe(2)
      expect(ws.getStatus()).toBe('connecting')

      ws.close()
    })

    it('updates status and listeners when device goes offline', () => {
      const statusSpy = vi.fn()
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        onStatusChange: statusSpy,
        enableJitter: false,
      })

      ws.connect()
      MockWebSocket.instances[0].emit('open')

      window.dispatchEvent(new Event('offline'))
      expect(ws.getStatusDetails().isOnline).toBe(false)

      window.dispatchEvent(new Event('online'))
      expect(ws.getStatusDetails().isOnline).toBe(true)

      ws.close()
    })

    it('handles WebSocket instantiation exceptions gracefully', () => {
      MockWebSocket.shouldFailConstructor = true

      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 500,
        enableJitter: false,
      })

      ws.connect()
      expect(ws.getStatus()).toBe('reconnecting')

      // Restore constructor and let next retry succeed
      MockWebSocket.shouldFailConstructor = false
      vi.advanceTimersByTime(500)

      expect(MockWebSocket.instances.length).toBe(1)
      MockWebSocket.instances[0].emit('open')
      expect(ws.getStatus()).toBe('open')

      ws.close()
    })
  })

  // ── 5. Status Listeners & Notifications ─────────────────────────────────────

  describe('Status Listeners', () => {
    it('notifies status listeners upon state transitions', () => {
      const transitions: WSStatus[] = []
      const ws = new WebSocketManager('ws://localhost:8080/ws', {
        reconnectInitialDelay: 500,
        enableJitter: false,
      })

      const unsub = ws.onStatusChange((status) => {
        transitions.push(status)
      })

      expect(transitions).toEqual(['closed']) // Immediate initial status

      ws.connect()
      expect(transitions).toContain('connecting')

      MockWebSocket.instances[0].emit('open')
      expect(transitions).toContain('open')

      MockWebSocket.instances[0].emit('close')
      expect(transitions).toContain('reconnecting')

      unsub()
      ws.close()
    })
  })
})
