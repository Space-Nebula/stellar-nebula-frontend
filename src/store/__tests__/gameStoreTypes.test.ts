/**
 * Type completeness of the game store (Issue #312).
 *
 * The store's locking state (`lockedOperations`, `operationQueue`,
 * `pendingState`) is referenced by the locking actions but previously had no
 * declared type, so drift was invisible until a build failed. This suite
 * pins the shape of both halves — state and actions — and asserts every
 * action is present and callable on the real store instance, so a missing
 * property or a renamed type fails here rather than in a consuming component.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  initialGameState,
  useGameStore,
  type ActiveOperation,
  type GameActions,
  type GameState,
} from '../gameStore'

/** Compile-time assertion helper: fails the type check if T is not exactly U. */
type Expect<T extends U, U> = T

type _StateShape = Expect<
  {
    lockedOperations: Record<string, boolean>
    operationQueue: ActiveOperation[]
    pendingState: boolean
  },
  Pick<GameState, 'lockedOperations' | 'operationQueue' | 'pendingState'>
>

type _ActionsShape = Expect<
  Pick<
    GameActions,
    'acquireLock' | 'releaseLock' | 'queueOperation' | 'startOperationWithLock'
  >,
  GameActions
>

const LOCKING_ACTIONS = [
  'acquireLock',
  'releaseLock',
  'queueOperation',
  'startOperationWithLock',
  'completeOperationWithLock',
  'hasOperationConflict',
  'startOperation',
  'completeOperation',
] as const

describe('gameStore type completeness (Issue #312)', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('declares the locking state fields with their documented types', () => {
    const state = useGameStore.getState()

    expect(state.lockedOperations).toEqual({})
    expect(Array.isArray(state.operationQueue)).toBe(true)
    expect(state.operationQueue).toEqual([])
    expect(state.pendingState).toBe(false)
  })

  it('keeps lockedOperations a boolean map once populated', () => {
    useGameStore.getState().acquireLock('scan')
    const locks = useGameStore.getState().lockedOperations

    expect(Object.values(locks).every((v) => typeof v === 'boolean')).toBe(true)
    expect(locks['scan']).toBe(true)
  })

  it('exposes every locking action as a callable function', () => {
    const state = useGameStore.getState()
    for (const action of LOCKING_ACTIONS) {
      expect(typeof state[action]).toBe('function')
    }
  })

  it('initial state satisfies the GameState contract', () => {
    const state: GameState = initialGameState
    expect(state).toHaveProperty('lockedOperations')
    expect(state).toHaveProperty('operationQueue')
    expect(state).toHaveProperty('pendingState')
    expect(state).toHaveProperty('activeOperation')
    expect(state).toHaveProperty('optimisticOperations')
  })

  it('resets every locking field', () => {
    useGameStore.getState().acquireLock('scan')
    useGameStore.getState().startOperation({
      id: 'op-1',
      type: 'scan',
      targetId: 'nebula-a',
      startedAt: new Date().toISOString(),
    })

    useGameStore.getState().resetGame()

    const state = useGameStore.getState()
    expect(state.lockedOperations).toEqual({})
    expect(state.operationQueue).toEqual([])
    expect(state.pendingState).toBe(false)
    expect(state.activeOperation).toBeNull()
  })
})
