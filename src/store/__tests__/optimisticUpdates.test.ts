import { beforeEach, describe, expect, it } from 'vitest'
import {
  useShipStore,
  useResourceStore,
  useGameStore,
  initialShipState,
  initialResourceState,
  initialGameState,
  type Ship,
} from '..'

const testShip: Ship = {
  id: 'ship-alpha',
  name: 'Alpha Scout',
  model: 'Explorer Mk I',
  status: 'docked',
  cargoCapacity: 100,
  crewCapacity: 4,
  lastKnownSector: 'Sector 1',
  stats: {
    speed: 10,
    scannerLevel: 1,
    shieldCapacity: 50,
    weaponPower: 20,
  },
}

describe('Optimistic State Updates and Rollback Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear()
    useShipStore.setState(initialShipState)
    useResourceStore.setState(initialResourceState)
    useGameStore.setState(initialGameState)
  })

  describe('Ship Store Optimistic Updates', () => {
    it('applies ship upgrade immediately and sets pending indicator', () => {
      useShipStore.getState().upsertShip(testShip)
      useShipStore.getState().setActiveShip(testShip.id)

      const txId = useShipStore
        .getState()
        .applyOptimisticShipUpdate('Upgrade: Cargo Expansion', testShip.id, {
          cargoCapacity: 220,
          crewCapacity: 6,
          status: 'in-flight',
          stats: { speed: 12 },
        })

      expect(txId).toBeDefined()
      const activeShip = useShipStore.getState().getActiveShip()
      expect(activeShip).toMatchObject({
        id: testShip.id,
        cargoCapacity: 220,
        crewCapacity: 6,
        status: 'in-flight',
        isPending: true,
        stats: {
          speed: 12,
          scannerLevel: 1,
          shieldCapacity: 50,
          weaponPower: 20,
        },
      })

      expect(useShipStore.getState().isShipPending(testShip.id)).toBe(true)
      const pendingTx = useShipStore.getState().getPendingShipTransaction(testShip.id)
      expect(pendingTx).toMatchObject({
        id: txId,
        label: 'Upgrade: Cargo Expansion',
        status: 'pending',
        before: testShip,
      })
    })

    it('confirms optimistic ship update and reconciles confirmed data', () => {
      useShipStore.getState().upsertShip(testShip)

      const txId = useShipStore
        .getState()
        .applyOptimisticShipUpdate('Upgrade: Cargo Expansion', testShip.id, {
          cargoCapacity: 220,
        })

      useShipStore.getState().confirmOptimisticShipUpdate(
        txId,
        {
          cargoCapacity: 220,
          lastKnownSector: 'Confirmed Sector On-Chain',
        },
        '0xabc123hash'
      )

      const ship = useShipStore.getState().ships.find((s) => s.id === testShip.id)
      expect(ship).toMatchObject({
        cargoCapacity: 220,
        lastKnownSector: 'Confirmed Sector On-Chain',
        isPending: false,
      })

      const confirmedTx = useShipStore
        .getState()
        .optimisticTransactions.find((tx) => tx.id === txId)
      expect(confirmedTx).toMatchObject({
        status: 'confirmed',
        transactionHash: '0xabc123hash',
      })
      expect(useShipStore.getState().isShipPending(testShip.id)).toBe(false)
    })

    it('reverts ship state to snapshot on error rollback', () => {
      useShipStore.getState().upsertShip(testShip)

      const txId = useShipStore
        .getState()
        .applyOptimisticShipUpdate('Upgrade: Warp Drive', testShip.id, {
          cargoCapacity: 500,
          crewCapacity: 20,
          status: 'maintenance',
        })

      expect(useShipStore.getState().ships[0].cargoCapacity).toBe(500)
      expect(useShipStore.getState().isShipPending(testShip.id)).toBe(true)

      // Rollback due to transaction rejection or contract error
      useShipStore.getState().rollbackOptimisticShipUpdate(txId, 'User rejected transaction')

      const revertedShip = useShipStore.getState().ships.find((s) => s.id === testShip.id)
      expect(revertedShip).toEqual({
        ...testShip,
        isPending: false,
      })

      const failedTx = useShipStore.getState().optimisticTransactions.find((tx) => tx.id === txId)
      expect(failedTx).toMatchObject({
        status: 'failed',
        error: 'User rejected transaction',
      })
      expect(useShipStore.getState().isShipPending(testShip.id)).toBe(false)
    })

    it('reconciles ship state with fresh blockchain metadata', () => {
      useShipStore.getState().upsertShip(testShip)

      useShipStore.getState().reconcileShipWithBlockchain(testShip.id, {
        name: 'Alpha Scout (Verified)',
        cargoCapacity: 150,
      })

      const ship = useShipStore.getState().ships.find((s) => s.id === testShip.id)
      expect(ship?.name).toBe('Alpha Scout (Verified)')
      expect(ship?.cargoCapacity).toBe(150)
    })
  })

  describe('Resource Store Optimistic Updates and Reconciliation', () => {
    it('applies optimistic update, tracks pending changes, and calculates affordances', () => {
      useResourceStore.getState().setInventory({
        credits: 1000,
        minerals: 200,
        fuel: 50,
        nebulaDust: 0,
        nebulite: 0,
        stellarium: 0,
        voidcrystal: 0,
        darkMatter: 0,
      })

      const txId = useResourceStore.getState().applyOptimisticUpdate('Buy Fuel', {
        credits: -100,
        fuel: 25,
      })

      expect(useResourceStore.getState().inventory.credits).toBe(900)
      expect(useResourceStore.getState().inventory.fuel).toBe(75)
      expect(useResourceStore.getState().isResourcePending('credits')).toBe(true)
      expect(useResourceStore.getState().isResourcePending('fuel')).toBe(true)
      expect(useResourceStore.getState().isResourcePending('minerals')).toBe(false)

      expect(useResourceStore.getState().getPendingResourceChanges()).toEqual({
        credits: -100,
        fuel: 25,
      })

      useResourceStore.getState().confirmOptimisticUpdate(txId, undefined, '0xtx123')
      expect(useResourceStore.getState().isResourcePending()).toBe(false)
    })

    it('optimistically applies scan harvest and rolls back on failure', () => {
      const { transactionId, event } = useResourceStore.getState().applyOptimisticHarvest(
        {
          resourceType: 'nebulite',
          amount: 50,
          scanPointId: 'anomaly-alpha',
          source: 'scan',
        },
        'Scan Anomaly: nebulite +50'
      )

      expect(event.amount).toBe(50)
      expect(useResourceStore.getState().inventory.nebulite).toBe(50)
      expect(useResourceStore.getState().harvested.nebulite).toBe(50)
      expect(useResourceStore.getState().lastHarvest?.scanPointId).toBe('anomaly-alpha')

      // Rollback
      useResourceStore.getState().rollbackOptimisticUpdate(transactionId, 'Scan connection lost')

      expect(useResourceStore.getState().inventory.nebulite).toBe(0)
      expect(useResourceStore.getState().harvested.nebulite).toBe(0)
      expect(useResourceStore.getState().lastHarvest).toBeNull()
      expect(useResourceStore.getState().harvestHistory).toHaveLength(0)
    })

    it('reconciles local resource inventory with on-chain balances', () => {
      useResourceStore.getState().setInventory({
        credits: 500,
        fuel: 10,
        minerals: 0,
        nebulaDust: 0,
        nebulite: 0,
        stellarium: 0,
        voidcrystal: 0,
        darkMatter: 0,
      })

      useResourceStore.getState().reconcileResourceInventory({
        credits: 1250,
        stellarium: 30,
      })

      expect(useResourceStore.getState().inventory).toMatchObject({
        credits: 1250,
        fuel: 10,
        stellarium: 30,
      })
    })
  })

  describe('Game Store Optimistic Operations', () => {
    it('starts optimistic operation with cooldown, and rolls back on error', () => {
      const opId = useGameStore.getState().startOptimisticOperation(
        {
          id: 'scan-op-1',
          type: 'scan',
          targetId: 'nebula-zone-9',
          startedAt: new Date().toISOString(),
        },
        'Scan Nebula Zone 9',
        30000
      )

      expect(useGameStore.getState().isOperationPending(opId)).toBe(true)
      expect(useGameStore.getState().activeOperation?.id).toBe('scan-op-1')
      expect(useGameStore.getState().isNebulaOnCooldown('nebula-zone-9')).toBe(true)

      // Rollback
      useGameStore.getState().rollbackOperation(opId, 'Transaction aborted', 'nebula-zone-9')

      expect(useGameStore.getState().activeOperation).toBeNull()
      expect(useGameStore.getState().isNebulaOnCooldown('nebula-zone-9')).toBe(false)
      expect(useGameStore.getState().isOperationPending(opId)).toBe(false)
    })

    it('confirms completed operation cleanly', () => {
      const opId = useGameStore.getState().startOptimisticOperation({
        id: 'travel-op-2',
        type: 'travel',
        targetId: 'sector-omega',
        startedAt: new Date().toISOString(),
      })

      useGameStore.getState().confirmOperation(opId)

      expect(useGameStore.getState().activeOperation).toBeNull()
      const op = useGameStore.getState().optimisticOperations.find((o) => o.id === opId)
      expect(op?.status).toBe('confirmed')
    })
  })

  describe('Coordinated Multi-Store Optimistic Updates', () => {
    it('handles coordinated ship upgrade and resource deduction with rollback', () => {
      useShipStore.getState().upsertShip(testShip)
      useResourceStore.getState().setInventory({
        credits: 2000,
        minerals: 100,
        fuel: 50,
        nebulaDust: 0,
        nebulite: 0,
        stellarium: 0,
        voidcrystal: 0,
        darkMatter: 0,
      })

      // Simulate user clicking "Apply Upgrade"
      const resourceTxId = useResourceStore.getState().applyOptimisticUpdate('Upgrade: Cargo', {
        credits: -1200,
        minerals: -45,
      })
      const shipTxId = useShipStore
        .getState()
        .applyOptimisticShipUpdate('Upgrade: Cargo', testShip.id, {
          cargoCapacity: testShip.cargoCapacity + 120,
        })

      // UI immediately reflects upgraded ship and deducted resources
      expect(useShipStore.getState().ships[0].cargoCapacity).toBe(220)
      expect(useShipStore.getState().ships[0].isPending).toBe(true)
      expect(useResourceStore.getState().inventory.credits).toBe(800)
      expect(useResourceStore.getState().inventory.minerals).toBe(55)

      // Simulate RPC error / simulation rejection
      const errorReason = 'Soroban simulation failed: insufficient gas limit'
      useShipStore.getState().rollbackOptimisticShipUpdate(shipTxId, errorReason)
      useResourceStore.getState().rollbackOptimisticUpdate(resourceTxId, errorReason)

      // Both stores rollback to exact snapshot
      expect(useShipStore.getState().ships[0].cargoCapacity).toBe(100)
      expect(useShipStore.getState().ships[0].isPending).toBe(false)
      expect(useResourceStore.getState().inventory.credits).toBe(2000)
      expect(useResourceStore.getState().inventory.minerals).toBe(100)
    })
  })
})
