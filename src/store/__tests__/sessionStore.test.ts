import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from '../sessionStore'

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().closeSession()
  })

  it('starts with initial state', () => {
    const state = useSessionStore.getState()
    expect(state.session).toBeNull()
    expect(state.startTime).toBeNull()
    expect(state.duration).toBe(0)
    expect(state.actions).toEqual([])
    expect(state.syncStatus).toBe('idle')
    expect(state.isExpired()).toBe(true)
  })

  it('opens a new session with tracking enabled', () => {
    const wallet = 'GABC123456789STELLAR'
    useSessionStore.getState().openSession(wallet)

    const state = useSessionStore.getState()
    expect(state.session).not.toBeNull()
    expect(state.session?.walletAddress).toBe(wallet)
    expect(state.startTime).not.toBeNull()
    expect(state.syncStatus).toBe('synced')
    expect(state.actions).toContain('session_started')
    expect(state.isExpired()).toBe(false)
  })

  it('tracks user session actions', () => {
    useSessionStore.getState().openSession('GABC123')
    useSessionStore.getState().trackAction('scanned_nebula')
    useSessionStore.getState().trackAction('upgraded_ship')

    const state = useSessionStore.getState()
    expect(state.actions).toEqual(['session_started', 'scanned_nebula', 'upgraded_ship'])
  })

  it('updates sync status', () => {
    useSessionStore.getState().openSession('GABC123')
    useSessionStore.getState().setSyncStatus('pending')
    expect(useSessionStore.getState().syncStatus).toBe('pending')

    useSessionStore.getState().setSyncStatus('synced')
    expect(useSessionStore.getState().syncStatus).toBe('synced')
  })

  it('clears session tracking on disconnect (closeSession)', () => {
    useSessionStore.getState().openSession('GABC123')
    useSessionStore.getState().trackAction('scanned_nebula')
    useSessionStore.getState().closeSession()

    const state = useSessionStore.getState()
    expect(state.session).toBeNull()
    expect(state.startTime).toBeNull()
    expect(state.duration).toBe(0)
    expect(state.actions).toEqual([])
    expect(state.syncStatus).toBe('idle')
  })
})
