import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { Inventory } from '../Resources/Inventory'
import { AchievementList } from '../Achievements/AchievementList'
import { SHIP_UPGRADES, UpgradeModal } from '../Ship/UpgradeModal'
import { TransactionHistory } from '../History/TransactionHistory'
import { useWallet } from '../../contexts/WalletContext'
import { useResourceStore, useShipStore } from '../../store'
import { ShipCard } from './ShipCard'
import { ContractUpgradeConfirmModal } from './ContractUpgradeConfirmModal'
import { DEMO_INVENTORY, DEMO_SHIPS, hasResources } from './dashboardData'
import { useShipUpgradeFlow } from './useShipUpgradeFlow'
import { useRenderCount } from '../../utils/performance-monitor'

// eslint-disable-next-line react-refresh/only-export-components
function ShipDashboard() {
  useRenderCount('ShipDashboard')
  const { walletState } = useWallet()
  const ships = useShipStore((state) => state.ships)
  const activeShipId = useShipStore((state) => state.activeShipId)
  const setShips = useShipStore((state) => state.setShips)
  const setActiveShip = useShipStore((state) => state.setActiveShip)
  const inventory = useResourceStore((state) => state.inventory)
  const setInventory = useResourceStore((state) => state.setInventory)
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

  const {
    upgradeContract,
    isUpgradeOpen,
    setIsUpgradeOpen,
    upgradeMessage,
    pendingContractUpgrade,
    setPendingContractUpgrade,
    isPreparingUpgrade,
    pendingUpgrade,
    latestUpgradeResult,
    handleApplyUpgrade,
    handleConfirmContractUpgrade,
  } = useShipUpgradeFlow(activeShip)

  const handleSelectShip = useCallback((shipId: string) => setActiveShip(shipId), [setActiveShip])
  const handleCloseUpgrade = useCallback(() => setIsUpgradeOpen(false), [setIsUpgradeOpen])
  const handleCancelContractUpgrade = useCallback(
    () => setPendingContractUpgrade(null),
    [setPendingContractUpgrade]
  )

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
                onSelect={handleSelectShip}
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
        onClose={handleCloseUpgrade}
        onConfirm={handleApplyUpgrade}
      />

      <ContractUpgradeConfirmModal
        upgrade={pendingContractUpgrade}
        upgradeContract={upgradeContract}
        walletPublicKey={walletState.publicKey}
        isPreparing={isPreparingUpgrade}
        onConfirm={handleConfirmContractUpgrade}
        onCancel={handleCancelContractUpgrade}
      />

      <section className="dashboard-history">
        <TransactionHistory
          accountId={walletState.isConnected ? walletState.publicKey : null}
          title="Ship transaction history"
        />
      </section>
    </section>
  )
}

export default memo(ShipDashboard) as unknown as typeof ShipDashboard
