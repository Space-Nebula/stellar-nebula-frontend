import { useState } from 'react'
import { NebulaCanvas } from '@components/Canvas'
import { ConnectModal, WalletDisplay } from '@components/Wallet'
import { Inventory } from '@components/Resources/Inventory'
import { ShareButton } from '@components/Social/ShareButton'
import { useAchievementStore, useResourceStore, type ResourceType } from '@/store'

function formatResource(resource: ResourceType): string {
  switch (resource) {
    case 'nebulaDust':
      return 'Nebula Dust'
    case 'darkMatter':
      return 'Dark Matter'
    case 'voidcrystal':
      return 'Voidcrystal'
    default:
      return resource[0].toUpperCase() + resource.slice(1)
  }
}

function NebulaView() {
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const lastHarvest = useResourceStore((state) => state.lastHarvest)
  const stats = useAchievementStore((state) => state.stats)

  return (
    <div className="nebula-view">
      <section className="page-panel nebula-view-meta">
        <p className="eyebrow">Nebula View</p>
        <h1>Survey active stellar clouds.</h1>
        <p className="page-copy">
          Review mapped sectors, anomaly density, and navigation conditions for upcoming
          expeditions.
        </p>

        <div className="home-hero-actions">
          <WalletDisplay onOpenConnectModal={() => setIsConnectOpen(true)} />
        </div>
      </section>

      <div className="nebula-view-canvas">
        <NebulaCanvas />
      </div>

      <div className="nebula-resource-grid">
        <section className="panel-card nebula-scan-panel" aria-live="polite">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Harvest</p>
              <h2>Latest scan reward</h2>
            </div>
          </div>

          {lastHarvest ? (
            <div className="scan-reward">
              <div>
                <span>+{lastHarvest.amount}</span>
                <strong>{formatResource(lastHarvest.resourceType)}</strong>
                <p>Collected from {lastHarvest.scanPointId}</p>
              </div>
              <ShareButton
                title={`Harvested ${lastHarvest.amount} ${formatResource(lastHarvest.resourceType)}`}
                description={`Scan ${lastHarvest.scanPointId} increased my Stellar Nebula resources.`}
                subject="scan"
                playerStats={{
                  scans: stats.scansCompleted,
                  upgrades: stats.shipsUpgraded,
                  resources: stats.resourcesCollected,
                }}
              />
            </div>
          ) : (
            <p className="page-copy">
              Scan a highlighted point in the nebula to harvest resources.
            </p>
          )}
        </section>

        <Inventory compact title="Harvested Resources" />
      </div>

      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </div>
  )
}

export default NebulaView
