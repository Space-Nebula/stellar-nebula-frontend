import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore, type ActiveOperation } from '../gameStore'

describe('useGameStore operation locking and queuing', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('starts operation with lock successfully when no conflict exists', () => {
    const op: ActiveOperation = {
      id: 'op-1',
      type: 'scan',
      targetId: 'nebula-alpha',
      startedAt: new Date().toISOString(),
    }

    const res = useGameStore.getState().startOperationWithLock(op)
    expect(res.success).toBe(true)
    expect(useGameStore.getState().activeOperation).toEqual(op)
    expect(useGameStore.getState().pendingState).toBe(true)
    expect(useGameStore.getState().hasOperationConflict('scan')).toBe(true)
  })

  it('prevents concurrent operations of same type (race condition protection)', () => {
    const op1: ActiveOperation = {
      id: 'op-1',
      type: 'scan',
      targetId: 'nebula-alpha',
      startedAt: new Date().toISOString(),
    }
    const op2: ActiveOperation = {
      id: 'op-2',
      type: 'scan',
      targetId: 'nebula-beta',
      startedAt: new Date().toISOString(),
    }

    const res1 = useGameStore.getState().startOperationWithLock(op1)
    expect(res1.success).toBe(true)

    // Attempting concurrent operation of same type fails with conflict
    const res2 = useGameStore.getState().startOperationWithLock(op2)
    expect(res2.success).toBe(false)
    expect(res2.reason).toContain('already in progress')

    // Original operation remains active
    expect(useGameStore.getState().activeOperation?.id).toBe('op-1')
  })

  it('queues concurrent operation when locked', () => {
    const op1: ActiveOperation = {
      id: 'op-1',
      type: 'mine',
      targetId: 'asteroid-1',
      startedAt: new Date().toISOString(),
    }
    const op2: ActiveOperation = {
      id: 'op-2',
      type: 'mine',
      targetId: 'asteroid-2',
      startedAt: new Date().toISOString(),
    }

    useGameStore.getState().startOperationWithLock(op1)
    const queueRes = useGameStore.getState().queueOperation(op2)

    expect(queueRes.queued).toBe(true)
    expect(queueRes.position).toBe(1)
    expect(useGameStore.getState().operationQueue).toHaveLength(1)

    // Completing op1 releases lock and starts op2 from queue automatically
    useGameStore.getState().completeOperationWithLock()
    expect(useGameStore.getState().activeOperation?.id).toBe('op-2')
    expect(useGameStore.getState().operationQueue).toHaveLength(0)
  })

  it('releases locks on exitNebula or resetGame', () => {
    const op: ActiveOperation = {
      id: 'op-1',
      type: 'travel',
      targetId: 'system-x',
      startedAt: new Date().toISOString(),
    }

    useGameStore.getState().startOperationWithLock(op)
    expect(useGameStore.getState().pendingState).toBe(true)

    useGameStore.getState().exitNebula()
    expect(useGameStore.getState().activeOperation).toBeNull()
    expect(useGameStore.getState().pendingState).toBe(false)
    expect(useGameStore.getState().hasOperationConflict('travel')).toBe(false)
  })
})

describe('startOperationWithLock success path and race conditions (Issue #314)', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  const op = (id: string, type: string, targetId: string): ActiveOperation => ({
    id,
    type,
    targetId,
    startedAt: new Date().toISOString(),
  })

  it('acquires the lock, sets the active operation and reports success', () => {
    const operation = op('op-1', 'scan', 'nebula-alpha')

    const result = useGameStore.getState().startOperationWithLock(operation)

    // success status returned
    expect(result).toEqual({ success: true })
    // active operation set
    expect(useGameStore.getState().activeOperation).toEqual(operation)
    // lock acquired for the operation type
    expect(useGameStore.getState().lockedOperations['scan']).toBe(true)
    expect(useGameStore.getState().hasOperationConflict('scan')).toBe(true)
    // pending state reflects the held lock
    expect(useGameStore.getState().pendingState).toBe(true)
  })

  it('reports a conflict and leaves state untouched when the same type is already active', () => {
    const first = op('op-1', 'mine', 'asteroid-1')
    const second = op('op-2', 'mine', 'asteroid-2')

    expect(useGameStore.getState().startOperationWithLock(first).success).toBe(true)
    const result = useGameStore.getState().startOperationWithLock(second)

    expect(result.success).toBe(false)
    expect(result.reason).toContain('mine')
    // The original operation is not clobbered.
    expect(useGameStore.getState().activeOperation).toEqual(first)
  })

  it('admits exactly one winner when the same type starts concurrently', () => {
    const attempts = Array.from({ length: 50 }, (_, i) =>
      op(`op-${i}`, 'scan', `nebula-${i}`)
    )

    const results = attempts.map((o) => useGameStore.getState().startOperationWithLock(o))
    const winners = results.filter((r) => r.success)

    // 50 concurrent attempts, exactly one acquires the lock.
    expect(winners).toHaveLength(1)
    expect(useGameStore.getState().activeOperation?.id).toBe('op-0')
    expect(Object.keys(useGameStore.getState().lockedOperations)).toEqual(['scan'])
  })

  it('re-acquires the lock after the operation completes', () => {
    const first = op('op-1', 'travel', 'system-x')
    expect(useGameStore.getState().startOperationWithLock(first).success).toBe(true)

    useGameStore.getState().completeOperationWithLock()

    const state = useGameStore.getState()
    expect(state.activeOperation).toBeNull()
    expect(state.lockedOperations['travel']).toBeUndefined()
    expect(state.pendingState).toBe(false)

    const second = op('op-2', 'travel', 'system-y')
    expect(useGameStore.getState().startOperationWithLock(second).success).toBe(true)
  })

  it('never loses a queued operation across a complete/start handoff', () => {
    const first = op('op-1', 'mine', 'asteroid-1')
    useGameStore.getState().startOperationWithLock(first)

    for (let i = 0; i < 5; i += 1) {
      useGameStore.getState().queueOperation(op(`queued-${i}`, 'mine', `asteroid-${i}`))
    }
    expect(useGameStore.getState().operationQueue).toHaveLength(5)

    useGameStore.getState().completeOperationWithLock()

    const state = useGameStore.getState()
    // One queued operation is promoted to active, the rest stay queued.
    expect(state.activeOperation?.id).toBe('queued-0')
    expect(state.operationQueue).toHaveLength(4)
  })
})
