import { useState, useEffect, useCallback } from 'react'
import {
  getWebSocketManager,
  type WebSocketManager,
  type ConnectionStatusDetails,
} from '@/services/websocket'

export interface UseWebSocketStatusReturn extends ConnectionStatusDetails {
  isConnected: boolean
  isReconnecting: boolean
  reconnect: () => void
  clearQueue: () => void
}

/**
 * Hook for consuming real-time WebSocket connection state,
 * including reconnect attempts, countdown, message replay queue,
 * and manual retry trigger.
 */
export function useWebSocketStatus(manager?: WebSocketManager): UseWebSocketStatusReturn {
  const wsManager = manager ?? getWebSocketManager()
  const [details, setDetails] = useState<ConnectionStatusDetails>(() =>
    wsManager.getStatusDetails()
  )

  useEffect(() => {
    return wsManager.onStatusChange((_status, newDetails) => {
      setDetails(newDetails)
    })
  }, [wsManager])

  const reconnect = useCallback(() => {
    wsManager.reconnect()
  }, [wsManager])

  const clearQueue = useCallback(() => {
    wsManager.clearQueue()
  }, [wsManager])

  return {
    ...details,
    isConnected: details.status === 'open',
    isReconnecting: details.status === 'reconnecting',
    reconnect,
    clearQueue,
  }
}

export default useWebSocketStatus
