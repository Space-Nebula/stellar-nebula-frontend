import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore, ActiveOperation } from '../gameStore'

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
