import { beforeEach, describe, expect, it } from 'vitest'
import {
  initialResourceState,
  initialShipState,
  initialUserState,
  resourceStoreStorageKey,
  shipStoreStorageKey,
  useResourceStore,
  useShipStore,
  userStoreStorageKey,
  useUserStore,
  type Ship,
  type UserSession,
} from '..'

const explorer: Ship = {
  id: 'ship-1',
  name: 'Aurora',
  model: 'Pathfinder',
  status: 'docked',
  cargoCapacity: 120,
  crewCapacity: 8,
}

const session: UserSession = {
  id: 'user-1',
  handle: 'nebula-pilot',
  walletAddress: 'GBZXAMPLEWALLET',
  roles: ['captain'],
}

describe('Zustand stores', () => {
  beforeEach(() => {
    localStorage.clear()
    useShipStore.setState(initialShipState)
    useResourceStore.setState(initialResourceState)
    useUserStore.setState(initialUserState)
  })

  it('manages ship data and active ship selection', () => {
    useShipStore.getState().upsertShip(explorer)
    useShipStore.getState().setActiveShip(explorer.id)
    useShipStore.getState().updateShipStatus(explorer.id, 'in-flight')

    expect(useShipStore.getState().activeShipId).toBe(explorer.id)
    expect(useShipStore.getState().ships).toEqual([{ ...explorer, status: 'in-flight' }])
  })

  it('keeps resource inventory updates isolated by resource type', () => {
    useResourceStore.getState().setResource('credits', 500)
    useResourceStore.getState().adjustResource('fuel', 25)

    expect(useResourceStore.getState().inventory).toEqual({
      credits: 500,
      fuel: 25,
      minerals: 0,
      nebulaDust: 0,
    })
  })

  it('applies, confirms, and rolls back optimistic resource updates', () => {
    useResourceStore.getState().setInventory({
      credits: 1000,
      fuel: 100,
      minerals: 80,
      nebulaDust: 10,
    })

    const failedId = useResourceStore.getState().applyOptimisticUpdate('Upgrade: Cargo', {
      credits: -250,
      minerals: -20,
    })

    expect(useResourceStore.getState().inventory).toMatchObject({
      credits: 750,
      minerals: 60,
    })
    expect(useResourceStore.getState().optimisticTransactions[0]).toMatchObject({
      id: failedId,
      status: 'pending',
    })

    useResourceStore.getState().rollbackOptimisticUpdate(failedId, 'rejected')

    expect(useResourceStore.getState().inventory).toMatchObject({
      credits: 1000,
      minerals: 80,
    })
    expect(useResourceStore.getState().optimisticTransactions[0]).toMatchObject({
      status: 'failed',
      error: 'rejected',
    })

    const confirmedId = useResourceStore.getState().applyOptimisticUpdate('Scan reward', {
      nebulaDust: 5,
    })
    useResourceStore.getState().confirmOptimisticUpdate(confirmedId)

    expect(useResourceStore.getState().inventory.nebulaDust).toBe(15)
    expect(useResourceStore.getState().optimisticTransactions[0].status).toBe('confirmed')
  })

  it('tracks user session authentication state', () => {
    useUserStore.getState().setSession(session)
    useUserStore.getState().updateSession({ handle: 'sector-lead' })

    expect(useUserStore.getState().isAuthenticated).toBe(true)
    expect(useUserStore.getState().session).toEqual({
      ...session,
      handle: 'sector-lead',
    })
  })

  it('persists serializable state to local storage', () => {
    useShipStore.getState().upsertShip(explorer)
    useResourceStore.getState().setResource('nebulaDust', 12)
    useUserStore.getState().setSession(session)

    expect(localStorage.getItem(shipStoreStorageKey)).toContain(explorer.id)
    expect(localStorage.getItem(resourceStoreStorageKey)).toContain('nebulaDust')
    expect(localStorage.getItem(userStoreStorageKey)).toContain(session.handle)
  })
})
