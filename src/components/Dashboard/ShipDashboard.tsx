import { useEffect, useMemo, useRef, useState } from 'react'
import { Inventory } from '../Resources/Inventory'
import { AchievementList } from '../Achievements/AchievementList'
import { SHIP_UPGRADES, UpgradeModal, type ShipUpgradeOption } from '../Ship/UpgradeModal'
import { TransactionHistory } from '../History/TransactionHistory'
import { ConfirmModal, TransactionPreview } from '../Transaction'
import { useShipUpgrade } from '../../hooks/contracts/useShipUpgrade'
import { useWallet } from '../../contexts/WalletContext'
import { trackEvent } from '../../services/analytics'
import { useTutorialStore } from '../../store/tutorialStore'
import {
  useResourceStore,
  useAchievementStore,
  useShipStore,
  type ResourceInventory,
  type ResourceType,
  type Ship,
} from '../../store'

const DEMO_SHIPS: Ship[] = [
  {
    id: 'aurora-wake',
    name: 'Aurora Wake',
    model: 'Explorer Mk II',
    status: 'docked',
    cargoCapacity: 320,
    crewCapacity: 12,
    lastKnownSector: 'Orion Drift',
  },
  {
    id: 'nebula-runner',
    name: 'Nebula Runner',
    model: 'Freighter LX',
    status: 'in-flight',
    cargoCapacity: 540,
    crewCapacity: 18,
    lastKnownSector: 'Pulsar Corridor',
  },
  {
    id: 'glass-comet',
    name: 'Glass Comet',
    model: 'Scout V',
    status: 'maintenance',
    cargoCapacity: 180,
    crewCapacity: 8,
    lastKnownSector: 'Silent Array',
  },
]

const DEMO_INVENTORY: ResourceInventory = {
  credits: 4200,
  fuel: 260,
  minerals: 180,
  nebulaDust: 90,
  nebulite: 120,
  stellarium: 65,
  voidcrystal: 30,
  darkMatter: 10,
}

const RESOURCE_ORDER: ResourceType[] = ['credits', 'fuel', 'minerals', 'nebulaDust']

function hasResources(
  inventory: ResourceInventory,
  cost: Partial<Record<ResourceType, number>>
): boolean {
  return RESOURCE_ORDER.every((resource) => (cost[resource] ?? 0) <= inventory[resource])
}

function ShipCard({
  ship,
  active,
  onSelect,
}: {
  ship: Ship
  active: boolean
  onSelect: (shipId: string) => void
}) {
  return (
    <button
      type="button"
      className={active ? 'ship-card is-active' : 'ship-card'}
      aria-label={`Select ship ${ship.name}, ${ship.model}, status ${ship.status}${active ? ', currently selected' : ''}`}
      aria-pressed={active}
      onClick={() => onSelect(ship.id)}
    >
      <div className="ship-card-top">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <p className="ship-name">{ship.name}</p>
            {ship.isPending && (
              <span className="pending-badge" title="State change pending confirmation">
                Pending
              </span>
            )}
          </div>
          <span className="ship-model">{ship.model}</span>
        </div>
        <span className={`status-pill status-${ship.status}`}>{ship.status}</span>
      </div>

      <dl className="ship-stats">
        <div>
          <dt>Cargo</dt>
          <dd>{ship.cargoCapacity}</dd>
        </div>
        <div>
          <dt>Crew</dt>
          <dd>{ship.crewCapacity}</dd>
        </div>
        <div>
          <dt>Sector</dt>
          <dd>{ship.lastKnownSector ?? 'Unknown'}</dd>
        </div>
      </dl>
    </button>
  )
}

function ShipDashboard() {
  const { walletState } = useWallet()
  const {
    ships,
    activeShipId,
    setShips,
    setActiveShip,
    upsertShip,
    applyOptimisticShipUpdate,
    confirmOptimisticShipUpdate,
    rollbackOptimisticShipUpdate,
    optimisticTransactions: shipOptimisticTransactions,
  } = useShipStore()
  const {
    inventory,
    optimisticTransactions,
    setInventory,
    applyOptimisticUpdate,
    confirmOptimisticUpdate,
    rollbackOptimisticUpdate,
  } = useResourceStore()
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null)
  // Contract-path pre-sign review: the upgrade is built + simulated first so
  // the player can verify the fee, resource cost, and expected outcome before
  // the wallet signs anything.
  const [pendingContractUpgrade, setPendingContractUpgrade] = useState<ShipUpgradeOption | null>(
    null
  )
  const [isPreparingUpgrade, setIsPreparingUpgrade] = useState(false)
  const recordUpgradeCompleted = useAchievementStore((state) => state.recordUpgradeCompleted)
  const completeTutorialObjective = useTutorialStore((state) => state.completeObjective)
  const seededShips = useRef(false)
  const seededInventory = useRef(false)

  useEffect(() => {
    if (!seededShips.current && ships.length === 0) {
      setShips(DEMO_SHIPS)
      seededShips.current = true
    }
  }, [setShips, ships.length])

  useEffect(() => {
    if (!seededInventory.current && Object.values(inventory).every((amount) => amount === 0)) {
      setInventory(DEMO_INVENTORY)
      seededInventory.current = true
    }
  }, [inventory, setInventory])

  const fleet = ships.length > 0 ? ships : DEMO_SHIPS

  useEffect(() => {
    if (!activeShipId && fleet.length > 0) {
      setActiveShip(fleet[0].id)
    }
  }, [activeShipId, fleet, setActiveShip])

  const activeShip = useMemo(
    () => fleet.find((ship) => ship.id === activeShipId) ?? fleet[0] ?? null,
    [activeShipId, fleet]
  )

  const upgradeContract = useShipUpgrade(activeShip?.id)

  const totalCargoCapacity = useMemo(
    () => fleet.reduce((sum, ship) => sum + ship.cargoCapacity, 0),
    [fleet]
  )

  const totalCrewCapacity = useMemo(
    () => fleet.reduce((sum, ship) => sum + ship.crewCapacity, 0),
    [fleet]
  )

  const dockedShips = useMemo(
    () => fleet.filter((ship) => ship.status === 'docked').length,
    [fleet]
  )

  const availableUpgrades = useMemo(
    () => SHIP_UPGRADES.filter((upgrade) => hasResources(inventory, upgrade.cost)).length,
    [inventory]
  )

  const pendingUpgrade =
    optimisticTransactions.find(
      (transaction) => transaction.status === 'pending' && transaction.label.startsWith('Upgrade:')
    ) ??
    shipOptimisticTransactions.find(
      (transaction) => transaction.status === 'pending' && transaction.label.startsWith('Upgrade:')
    )

  const latestUpgradeResult =
    optimisticTransactions.find(
      (transaction) => transaction.label.startsWith('Upgrade:') && transaction.status !== 'pending'
    ) ??
    shipOptimisticTransactions.find(
      (transaction) => transaction.label.startsWith('Upgrade:') && transaction.status !== 'pending'
    )

  const handleApplyUpgrade = async (upgrade: ShipUpgradeOption) => {
    if (!activeShip || !hasResources(inventory, upgrade.cost)) return

    const changes = Object.fromEntries(
      Object.entries(upgrade.cost).map(([resource, amount]) => [resource, -(amount ?? 0)])
    ) as Partial<Record<ResourceType, number>>
    trackEvent('upgrade_started', {
      upgradeId: upgrade.id,
      shipModel: activeShip.model,
      creditsCost: upgrade.cost.credits ?? 0,
      mineralsCost: upgrade.cost.minerals ?? 0,
    })

    const upgradedShip: Partial<Ship> = {
      cargoCapacity: activeShip.cargoCapacity + (upgrade.cargoDelta ?? 0),
      crewCapacity: activeShip.crewCapacity + (upgrade.crewDelta ?? 0),
      status: upgrade.statusAfter ?? 'docked',
      lastKnownSector: upgrade.sectorLabel ?? activeShip.lastKnownSector,
    }

    // 1. Immediately apply optimistic updates to BOTH resource store and ship store
    const resourceTxId = applyOptimisticUpdate(`Upgrade: ${upgrade.name}`, changes)
    const shipTxId = applyOptimisticShipUpdate(
      `Upgrade: ${upgrade.name}`,
      activeShip.id,
      upgradedShip
    )

    trackEvent('upgrade_started', {
      upgradeId: upgrade.id,
      shipModel: activeShip.model,
      creditsCost: upgrade.cost.credits ?? 0,
      mineralsCost: upgrade.cost.minerals ?? 0,
    })

    const useContractPath = walletState.isConnected && Boolean(upgradeContract.shipNFT)

    if (useContractPath) {
      // Phase 1 — build + simulate, surface the preview, and hand it to the
      // player for review in the confirm modal. Nothing is signed yet and no
      // optimistic update is applied: the actual submission does that.
      setIsPreparingUpgrade(true)
      try {
        await upgradeContract.buildUpgradeTransaction()
        setPendingContractUpgrade(upgrade)
      } catch {
        setUpgradeMessage(
          `${upgrade.name} could not be simulated: ${upgradeContract.error ?? 'unknown error'}.`
        )
        return
      } finally {
        setIsPreparingUpgrade(false)
      }
      setUpgradeMessage(`${upgrade.name} is submitting on-chain…`)
      setIsUpgradeOpen(false)

      try {
        const txHash = await upgradeContract.executeUpgrade()

        if (txHash) {
          confirmOptimisticShipUpdate(shipTxId, undefined, txHash)
          confirmOptimisticUpdate(resourceTxId, undefined, txHash)
          void upgradeContract.refresh()
          recordUpgradeCompleted({ upgradeId: upgrade.id, shipId: activeShip.id })
          completeTutorialObjective('first-upgrade')
          trackEvent('upgrade_confirmed', {
            upgradeId: upgrade.id,
            cargoDelta: upgrade.cargoDelta ?? 0,
            crewDelta: upgrade.crewDelta ?? 0,
            txHash,
          })
          setUpgradeMessage(`${upgrade.name} confirmed on-chain (${txHash.slice(0, 8)}).`)
        } else {
          const errMsg = upgradeContract.error ?? 'Contract upgrade failed'
          rollbackOptimisticShipUpdate(shipTxId, errMsg)
          rollbackOptimisticUpdate(resourceTxId, errMsg)
          trackEvent('upgrade_failed', {
            upgradeId: upgrade.id,
            reason: 'contract_error',
          })
          setUpgradeMessage(`${upgrade.name} failed and changes were rolled back.`)
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Contract upgrade failed'
        rollbackOptimisticShipUpdate(shipTxId, errMsg)
        rollbackOptimisticUpdate(resourceTxId, errMsg)
        trackEvent('upgrade_failed', {
          upgradeId: upgrade.id,
          reason: 'contract_exception',
        })
        setUpgradeMessage(`${upgrade.name} failed and changes were rolled back.`)
      }
      return
    }

    void applyOptimisticUpdate(`Upgrade: ${upgrade.name}`, changes)
    upsertShip(upgradedShip as Ship)

    setUpgradeMessage(`${upgrade.name} is pending transaction confirmation.`)
    setUpgradeMessage(`${upgrade.name} is pending confirmation.`)
    setIsUpgradeOpen(false)

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 700))
      confirmOptimisticShipUpdate(shipTxId)
      confirmOptimisticUpdate(resourceTxId)
      recordUpgradeCompleted({ upgradeId: upgrade.id, shipId: activeShip.id })
      completeTutorialObjective('first-upgrade')
      trackEvent('upgrade_confirmed', {
        upgradeId: upgrade.id,
        cargoDelta: upgrade.cargoDelta ?? 0,
        crewDelta: upgrade.crewDelta ?? 0,
      })
      setUpgradeMessage(`${upgrade.name} confirmed successfully.`)
    } catch (error) {
      rollbackOptimisticShipUpdate(
        shipTxId,
        error instanceof Error ? error.message : 'Upgrade failed'
      )
      rollbackOptimisticUpdate(
        resourceTxId,
        error instanceof Error ? error.message : 'Upgrade failed'
      )
      trackEvent('upgrade_failed', {
        upgradeId: upgrade.id,
        reason: error instanceof Error ? error.name || 'Error' : 'unknown',
      })
      setUpgradeMessage(`${upgrade.name} failed and changes were rolled back.`)
    }
  }

  // Phase 2 — the player reviewed the simulation and confirmed. Now actually
  // sign, submit, and reconcile the optimistic ship update.
  const handleConfirmContractUpgrade = async () => {
    if (!pendingContractUpgrade || !activeShip) return

    const upgrade = pendingContractUpgrade
    const previousShip = activeShip
    const changes = Object.fromEntries(
      Object.entries(upgrade.cost).map(([resource, amount]) => [resource, -(amount ?? 0)])
    ) as Partial<Record<ResourceType, number>>
    const transactionId = applyOptimisticUpdate(`Upgrade: ${upgrade.name}`, changes)

    const upgradedShip = {
      ...activeShip,
      cargoCapacity: activeShip.cargoCapacity + (upgrade.cargoDelta ?? 0),
      crewCapacity: activeShip.crewCapacity + (upgrade.crewDelta ?? 0),
      status: upgrade.statusAfter ?? 'docked',
      lastKnownSector: upgrade.sectorLabel ?? activeShip.lastKnownSector,
    }

    setPendingContractUpgrade(null)
    setUpgradeMessage(`${upgrade.name} is submitting its transaction on-chain…`)

    const txHash = await upgradeContract.executeUpgrade()

    if (txHash) {
      upsertShip(upgradedShip)
      confirmOptimisticUpdate(transactionId)
      trackEvent('upgrade_confirmed', {
        upgradeId: upgrade.id,
        cargoDelta: upgrade.cargoDelta ?? 0,
        crewDelta: upgrade.crewDelta ?? 0,
        txHash,
      })
      setUpgradeMessage(`${upgrade.name} confirmed on-chain (${txHash.slice(0, 8)}).`)
      setIsUpgradeOpen(false)
    } else {
      upsertShip(previousShip)
      rollbackOptimisticUpdate(transactionId, upgradeContract.error ?? 'Contract upgrade failed')
      trackEvent('upgrade_failed', {
        upgradeId: upgrade.id,
        reason: 'contract_error',
      })
      setUpgradeMessage(`${upgrade.name} failed and resource changes were rolled back.`)
    }
  }

  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Ship Dashboard</p>
          <h1>Fleet command, inventory, and upgrades in one place.</h1>
          <p className="page-copy">
            Monitor live ship state from the local fleet store, review resource reserves, and stage
            ordered upgrade batches without leaving the dashboard.
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            type="button"
            className="primary-button"
            aria-label={
              pendingUpgrade
                ? 'Ship upgrade pending, cannot open upgrade bay'
                : 'Open ship upgrade bay'
            }
            onClick={() => setIsUpgradeOpen(true)}
            disabled={Boolean(pendingUpgrade)}
          >
            {pendingUpgrade ? 'Upgrade pending' : 'Open upgrade bay'}
          </button>
          <span className="dashboard-hint">{availableUpgrades} upgrades currently affordable</span>
        </div>
      </div>

      {(upgradeMessage || latestUpgradeResult) && (
        <div
          className={`transaction-banner ${
            pendingUpgrade
              ? 'transaction-banner-pending'
              : latestUpgradeResult?.status === 'failed'
                ? 'transaction-banner-error'
                : 'transaction-banner-success'
          }`}
          role={latestUpgradeResult?.status === 'failed' ? 'alert' : 'status'}
        >
          {upgradeMessage ??
            (latestUpgradeResult?.status === 'failed'
              ? (latestUpgradeResult.error ?? 'Transaction failed and was rolled back.')
              : 'Transaction confirmed successfully.')}
        </div>
      )}

      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Fleet size</span>
          <strong>{fleet.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Docked ships</span>
          <strong>{dockedShips}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Cargo capacity</span>
          <strong>{totalCargoCapacity}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Crew capacity</span>
          <strong>{totalCrewCapacity}</strong>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fleet</p>
              <h2>Tracked ships</h2>
            </div>
            <span className="section-meta">
              {activeShip ? `Selected: ${activeShip.name}` : 'No active ship'}
            </span>
          </div>

          <div className="ship-list">
            {fleet.map((ship) => (
              <ShipCard
                key={ship.id}
                ship={ship}
                active={ship.id === activeShip?.id}
                onSelect={(shipId) => setActiveShip(shipId)}
              />
            ))}
          </div>
        </section>

        <div className="dashboard-column">
          <Inventory inventory={inventory} />

          <section className="panel-card panel-card-tight">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Upgrade Queue</p>
                <h2>Ready for batch execution</h2>
              </div>
              <span className="section-meta">
                {walletState.isConnected
                  ? upgradeContract.shipNFT
                    ? 'Contract upgrades available'
                    : 'On-chain upgrades need a funded ship'
                  : 'Connect a wallet for on-chain upgrades'}
              </span>
            </div>

            <div className="queue-list">
              {SHIP_UPGRADES.map((upgrade) => (
                <div key={upgrade.id} className="queue-item">
                  <div>
                    <strong>{upgrade.name}</strong>
                    <p>{upgrade.description}</p>
                  </div>
                  <span>
                    {pendingUpgrade?.label === `Upgrade: ${upgrade.name}`
                      ? 'Pending'
                      : hasResources(inventory, upgrade.cost)
                        ? 'Ready'
                        : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <AchievementList />

      <UpgradeModal
        isOpen={isUpgradeOpen}
        ship={activeShip}
        inventory={inventory}
        isPending={Boolean(pendingUpgrade)}
        onClose={() => setIsUpgradeOpen(false)}
        onConfirm={handleApplyUpgrade}
      />

      <ConfirmModal
        isOpen={Boolean(pendingContractUpgrade)}
        title={`Confirm ${pendingContractUpgrade?.name ?? 'upgrade'}`}
        operationType="upgradeShip"
        estimatedFee={
          upgradeContract.simulation
            ? `${(Number(upgradeContract.simulation.minResourceFee) / 10_000_000).toFixed(7)} XLM`
            : 'Estimating…'
        }
        details={[
          {
            label: 'Resources consumed',
            value: pendingContractUpgrade
              ? Object.entries(pendingContractUpgrade.cost)
                  .map(([name, amount]) => `${name}: ${amount}`)
                  .join(', ')
              : '',
          },
          {
            label: 'Wallet',
            value: walletState.publicKey
              ? `${walletState.publicKey.slice(0, 6)}…${walletState.publicKey.slice(-6)}`
              : 'Disconnected',
          },
        ]}
        isSubmitting={isPreparingUpgrade}
        confirmLabel="Review and sign"
        onConfirm={handleConfirmContractUpgrade}
        onCancel={() => setPendingContractUpgrade(null)}
      >
        {pendingContractUpgrade && (
          <TransactionPreview
            operationName="upgrade_ship"
            feeStroops={upgradeContract.simulation?.minResourceFee ?? null}
            simulation={upgradeContract.simulation}
            simulationError={upgradeContract.error}
            costs={
              pendingContractUpgrade
                ? Object.entries(pendingContractUpgrade.cost).map(([name, amount]) => ({
                    label: name,
                    amount: String(amount),
                  }))
                : []
            }
            outcomes={
              upgradeContract.simulation?.value &&
              typeof upgradeContract.simulation.value === 'object'
                ? Object.entries(upgradeContract.simulation.value as Record<string, unknown>).map(
                    ([key, value]) => ({
                      label: key,
                      value: typeof value === 'string' ? value : JSON.stringify(value),
                    })
                  )
                : []
            }
          />
        )}
      </ConfirmModal>

      <section className="dashboard-history">
        <TransactionHistory
          accountId={walletState.isConnected ? walletState.publicKey : null}
          title="Ship transaction history"
        />
      </section>
    </section>
  )
}

export default ShipDashboard
