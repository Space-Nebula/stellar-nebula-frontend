import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore, initialGameState } from '../gameStore'
import { useGraphicsStore, initialGraphicsState } from '../graphicsStore'
import { useSettingsStore, initialSettingsState } from '../settingsStore'
import { useSessionStore, initialSessionState } from '../sessionStore'
import { useTutorialStore, initialTutorialState } from '../tutorialStore'
import { useShipStore, initialShipState } from '../shipStore'
import { useResourceStore, initialResourceState } from '../resourceStore'
import { useUserStore, initialUserState } from '../userStore'

describe('gameStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore.setState(initialGameState)
  })

  it('starts in loading phase', () => {
    expect(useGameStore.getState().phase).toBe('loading')
  })

  it('transitions between phases', () => {
    const { setPhase } = useGameStore.getState()
    setPhase('menu')
    expect(useGameStore.getState().phase).toBe('menu')
    setPhase('playing')
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('enters and exits nebula', () => {
    useGameStore.getState().setPhase('menu')
    useGameStore.getState().enterNebula('neb-1')
    expect(useGameStore.getState().currentNebulaId).toBe('neb-1')
    expect(useGameStore.getState().phase).toBe('playing')

    useGameStore.getState().exitNebula()
    expect(useGameStore.getState().currentNebulaId).toBeNull()
    expect(useGameStore.getState().activeOperation).toBeNull()
  })

  it('manages active operations', () => {
    const op = {
      id: 'op-1',
      type: 'scan' as const,
      targetId: 't-1',
      startedAt: new Date().toISOString(),
    }
    useGameStore.getState().startOperation(op)
    expect(useGameStore.getState().activeOperation).toEqual(op)

    useGameStore.getState().completeOperation()
    expect(useGameStore.getState().activeOperation).toBeNull()
  })

  it('adds and prunes scan cooldowns', () => {
    useGameStore.getState().addScanCooldown('neb-1', 1000)
    expect(useGameStore.getState().scanCooldowns).toHaveLength(1)
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(true)

    useGameStore.getState().addScanCooldown('neb-1', 1000)
    expect(useGameStore.getState().scanCooldowns).toHaveLength(1)

    vi.useFakeTimers()
    vi.advanceTimersByTime(2000)
    useGameStore.getState().pruneExpiredCooldowns()
    expect(useGameStore.getState().scanCooldowns).toHaveLength(0)
    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(false)
    vi.useRealTimers()
  })

  it('ticks elapsed seconds', () => {
    useGameStore.getState().tickElapsed(10)
    expect(useGameStore.getState().elapsedSeconds).toBe(10)
    useGameStore.getState().tickElapsed(5)
    expect(useGameStore.getState().elapsedSeconds).toBe(15)
  })

  it('resets game state', () => {
    useGameStore.getState().setPhase('playing')
    useGameStore.getState().enterNebula('neb-1')
    useGameStore.getState().resetGame()
    expect(useGameStore.getState().phase).toBe('loading')
    expect(useGameStore.getState().currentNebulaId).toBeNull()
  })

  it('persists to localStorage', () => {
    useGameStore.getState().enterNebula('neb-1')
    expect(localStorage.getItem('stellar-nebula:game-store')).toContain('neb-1')
  })
})

describe('graphicsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useGraphicsStore.setState(initialGraphicsState)
  })

  it('starts with default graphics settings', () => {
    const state = useGraphicsStore.getState()
    expect(state.bloomEnabled).toBe(true)
    expect(state.performanceMode).toBe(false)
    expect(state.zoomLevel).toBe('exploration')
  })

  it('toggles bloom', () => {
    useGraphicsStore.getState().setBloomEnabled(false)
    expect(useGraphicsStore.getState().bloomEnabled).toBe(false)
  })

  it('clamps bloom intensity', () => {
    useGraphicsStore.getState().setBloomIntensity(5)
    expect(useGraphicsStore.getState().bloomIntensity).toBe(1.2)
    useGraphicsStore.getState().setBloomIntensity(-1)
    expect(useGraphicsStore.getState().bloomIntensity).toBe(0)
  })

  it('clamps starfield density', () => {
    useGraphicsStore.getState().setStarfieldDensity(10)
    expect(useGraphicsStore.getState().starfieldDensity).toBe(1.5)
    useGraphicsStore.getState().setStarfieldDensity(0)
    expect(useGraphicsStore.getState().starfieldDensity).toBe(0.4)
  })

  it('sets zoom level', () => {
    useGraphicsStore.getState().setZoomLevel('detail')
    expect(useGraphicsStore.getState().zoomLevel).toBe('detail')
  })

  it('toggles auto rotate', () => {
    useGraphicsStore.getState().setAutoRotateEnabled(false)
    expect(useGraphicsStore.getState().autoRotateEnabled).toBe(false)
  })

  it('persists to localStorage', () => {
    useGraphicsStore.getState().setPerformanceMode(true)
    expect(localStorage.getItem('stellar-nebula:graphics-store')).toContain('true')
  })
})

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState(initialSettingsState)
  })

  it('starts with default settings', () => {
    const state = useSettingsStore.getState()
    expect(state.graphicsQuality).toBe('high')
    expect(state.soundEnabled).toBe(true)
    expect(state.network).toBe('futurenet')
  })

  it('sets graphics quality', () => {
    useSettingsStore.getState().setGraphicsQuality('low')
    expect(useSettingsStore.getState().graphicsQuality).toBe('low')
  })

  it('toggles sound', () => {
    useSettingsStore.getState().setSoundEnabled(false)
    expect(useSettingsStore.getState().soundEnabled).toBe(false)
  })

  it('toggles notifications', () => {
    useSettingsStore.getState().setNotificationsEnabled(false)
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false)
  })

  it('toggles analytics', () => {
    useSettingsStore.getState().setAnalyticsEnabled(false)
    expect(useSettingsStore.getState().analyticsEnabled).toBe(false)
  })

  it('sets network', () => {
    useSettingsStore.getState().setNetwork('testnet')
    expect(useSettingsStore.getState().network).toBe('testnet')
  })
})

describe('sessionStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.setState(initialSessionState)
  })

  it('starts with no session', () => {
    expect(useSessionStore.getState().session).toBeNull()
  })

  it('opens a session', () => {
    useSessionStore.getState().openSession('GABC...')
    const session = useSessionStore.getState().session
    expect(session).not.toBeNull()
    expect(session?.walletAddress).toBe('GABC...')
    expect(session?.preferences.theme).toBe('dark')
  })

  it('updates preferences', () => {
    useSessionStore.getState().openSession('GABC...')
    useSessionStore.getState().updatePreferences({ soundEnabled: false })
    expect(useSessionStore.getState().session?.preferences.soundEnabled).toBe(false)
  })

  it('refreshes session expiry', () => {
    useSessionStore.getState().openSession('GABC...')
    const before = useSessionStore.getState().session?.expiresAt
    vi.useFakeTimers()
    vi.advanceTimersByTime(1000)
    useSessionStore.getState().refreshSession()
    const after = useSessionStore.getState().session?.expiresAt
    expect(after).not.toBe(before)
    vi.useRealTimers()
  })

  it('closes session', () => {
    useSessionStore.getState().openSession('GABC...')
    useSessionStore.getState().closeSession()
    expect(useSessionStore.getState().session).toBeNull()
  })

  it('detects expired session', () => {
    expect(useSessionStore.getState().isExpired()).toBe(true)

    vi.useFakeTimers()
    useSessionStore.getState().openSession('GABC...', 1000)
    expect(useSessionStore.getState().isExpired()).toBe(false)

    vi.advanceTimersByTime(2000)
    expect(useSessionStore.getState().isExpired()).toBe(true)
    vi.useRealTimers()
  })
})

describe('tutorialStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useTutorialStore.setState(initialTutorialState)
  })

  it('starts in initial state', () => {
    const state = useTutorialStore.getState()
    expect(state.completed).toBe(false)
    expect(state.currentStep).toBe(0)
    expect(state.dismissed).toBe(false)
    expect(state.startedAt).toBeNull()
  })

  it('sets step and records start time', () => {
    useTutorialStore.getState().setStep(1)
    expect(useTutorialStore.getState().currentStep).toBe(1)
    expect(useTutorialStore.getState().startedAt).toBeTruthy()
  })

  it('completes objectives', () => {
    useTutorialStore.getState().completeObjective('connect-wallet')
    expect(useTutorialStore.getState().completedObjectives).toContain('connect-wallet')
    expect(useTutorialStore.getState().completedObjectives).toHaveLength(1)
  })

  it('does not duplicate objectives', () => {
    useTutorialStore.getState().completeObjective('first-scan')
    useTutorialStore.getState().completeObjective('first-scan')
    expect(useTutorialStore.getState().completedObjectives).toHaveLength(1)
  })

  it('completes tutorial', () => {
    useTutorialStore.getState().complete()
    expect(useTutorialStore.getState().completed).toBe(true)
    expect(useTutorialStore.getState().dismissed).toBe(true)
  })

  it('dismisses tutorial', () => {
    useTutorialStore.getState().dismiss()
    expect(useTutorialStore.getState().dismissed).toBe(true)
  })

  it('replays tutorial', () => {
    useTutorialStore.getState().complete()
    useTutorialStore.getState().replay()
    const state = useTutorialStore.getState()
    expect(state.completed).toBe(false)
    expect(state.dismissed).toBe(false)
    expect(state.currentStep).toBe(0)
    expect(state.completedObjectives).toEqual([])
  })
})

describe('shipStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useShipStore.setState(initialShipState)
  })

  it('starts empty', () => {
    expect(useShipStore.getState().ships).toEqual([])
    expect(useShipStore.getState().activeShipId).toBeNull()
  })

  it('adds and updates ships', () => {
    useShipStore.getState().upsertShip({
      id: 's1',
      name: 'Aurora',
      model: 'Pathfinder',
      status: 'docked',
      cargoCapacity: 100,
      crewCapacity: 5,
    })
    expect(useShipStore.getState().ships).toHaveLength(1)

    useShipStore.getState().upsertShip({
      id: 's1',
      name: 'Aurora MK2',
      model: 'Pathfinder',
      status: 'in-flight',
      cargoCapacity: 150,
      crewCapacity: 8,
    })
    expect(useShipStore.getState().ships).toHaveLength(1)
    expect(useShipStore.getState().ships[0].name).toBe('Aurora MK2')
  })

  it('removes ship and clears active if removed', () => {
    useShipStore.getState().upsertShip({
      id: 's1',
      name: 'Aurora',
      model: 'P',
      status: 'docked',
      cargoCapacity: 100,
      crewCapacity: 5,
    })
    useShipStore.getState().setActiveShip('s1')
    useShipStore.getState().removeShip('s1')
    expect(useShipStore.getState().ships).toHaveLength(0)
    expect(useShipStore.getState().activeShipId).toBeNull()
  })

  it('updates ship status', () => {
    useShipStore.getState().upsertShip({
      id: 's1',
      name: 'Aurora',
      model: 'P',
      status: 'docked',
      cargoCapacity: 100,
      crewCapacity: 5,
    })
    useShipStore.getState().updateShipStatus('s1', 'maintenance')
    expect(useShipStore.getState().ships[0].status).toBe('maintenance')
  })

  it('updates ship stats', () => {
    useShipStore.getState().upsertShip({
      id: 's1',
      name: 'Aurora',
      model: 'P',
      status: 'docked',
      cargoCapacity: 100,
      crewCapacity: 5,
    })
    useShipStore.getState().updateShipStats('s1', { speed: 10, scannerLevel: 3 })
    expect(useShipStore.getState().ships[0].stats).toMatchObject({ speed: 10, scannerLevel: 3 })
  })

  it('gets active ship', () => {
    expect(useShipStore.getState().getActiveShip()).toBeNull()

    useShipStore.getState().upsertShip({
      id: 's1',
      name: 'Aurora',
      model: 'P',
      status: 'docked',
      cargoCapacity: 100,
      crewCapacity: 5,
    })
    useShipStore.getState().setActiveShip('s1')
    expect(useShipStore.getState().getActiveShip()?.id).toBe('s1')
  })

  it('resets', () => {
    useShipStore.getState().upsertShip({
      id: 's1',
      name: 'Aurora',
      model: 'P',
      status: 'docked',
      cargoCapacity: 100,
      crewCapacity: 5,
    })
    useShipStore.getState().resetShips()
    expect(useShipStore.getState().ships).toEqual([])
  })
})

describe('resourceStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useResourceStore.setState(initialResourceState)
  })

  it('starts with zero inventory', () => {
    const inv = useResourceStore.getState().inventory
    expect(Object.values(inv).every((v) => v === 0)).toBe(true)
  })

  it('sets and adjusts resources', () => {
    useResourceStore.getState().setResource('credits', 100)
    expect(useResourceStore.getState().inventory.credits).toBe(100)

    useResourceStore.getState().adjustResource('credits', 50)
    expect(useResourceStore.getState().inventory.credits).toBe(150)

    useResourceStore.getState().adjustResource('credits', -200)
    expect(useResourceStore.getState().inventory.credits).toBe(0)
  })

  it('can afford check', () => {
    useResourceStore.getState().setResource('credits', 50)
    expect(useResourceStore.getState().canAfford('credits', 50)).toBe(true)
    expect(useResourceStore.getState().canAfford('credits', 51)).toBe(false)
  })

  it('handles harvest events', () => {
    const event = useResourceStore.getState().harvestResource({
      scanPointId: 'sp-1',
      resourceType: 'stellarium',
      amount: 10,
    })
    expect(event.resourceType).toBe('stellarium')
    expect(useResourceStore.getState().inventory.stellarium).toBe(10)
  })

  it('resets resources', () => {
    useResourceStore.getState().setResource('credits', 500)
    useResourceStore.getState().resetResources()
    expect(useResourceStore.getState().inventory.credits).toBe(0)
  })
})

describe('userStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useUserStore.setState(initialUserState)
  })

  it('starts unauthenticated', () => {
    expect(useUserStore.getState().isAuthenticated).toBe(false)
    expect(useUserStore.getState().session).toBeNull()
  })

  it('sets session and marks authenticated', () => {
    useUserStore.getState().setSession({
      id: 'u1',
      handle: 'pilot',
      roles: ['captain'],
    })
    expect(useUserStore.getState().isAuthenticated).toBe(true)
    expect(useUserStore.getState().session?.handle).toBe('pilot')
  })

  it('updates session fields', () => {
    useUserStore.getState().setSession({
      id: 'u1',
      handle: 'pilot',
      roles: ['captain'],
    })
    useUserStore.getState().updateSession({ handle: 'commander' })
    expect(useUserStore.getState().session?.handle).toBe('commander')
  })

  it('clears session', () => {
    useUserStore.getState().setSession({
      id: 'u1',
      handle: 'pilot',
      roles: ['captain'],
    })
    useUserStore.getState().clearSession()
    expect(useUserStore.getState().isAuthenticated).toBe(false)
    expect(useUserStore.getState().session).toBeNull()
  })
})
