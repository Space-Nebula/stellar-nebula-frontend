import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WebSocketStatus } from '../WebSocketStatus'
import { WebSocketManager } from '@/services/websocket'

describe('WebSocketStatus Component', () => {
  let manager: WebSocketManager

  beforeEach(() => {
    manager = new WebSocketManager('ws://localhost:8080/ws', { enableJitter: false })
  })

  it('renders disconnected state by default', () => {
    render(<WebSocketStatus manager={manager} variant="pill" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reconnect websocket/i })).toBeInTheDocument()
  })

  it('triggers manager.reconnect() when retry button is clicked', () => {
    const reconnectSpy = vi.spyOn(manager, 'reconnect').mockImplementation(() => {})
    render(<WebSocketStatus manager={manager} variant="pill" />)

    const retryBtn = screen.getByRole('button', { name: /reconnect websocket/i })
    fireEvent.click(retryBtn)

    expect(reconnectSpy).toHaveBeenCalled()
  })

  it('renders compact variant', () => {
    render(<WebSocketStatus manager={manager} variant="compact" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument()
  })

  it('renders banner variant with queued messages', () => {
    manager.send({ test: 'offline_msg' })
    render(<WebSocketStatus manager={manager} variant="banner" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/1 message queued for replay/i)).toBeInTheDocument()
  })
})
