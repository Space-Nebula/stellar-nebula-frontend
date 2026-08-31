import { useCallback, useState } from 'react'
import { NebulaCanvas } from '@components/Canvas'
import { ConnectModal, WalletDisplay } from '@components/Wallet'
import { Inventory } from '@components/Resources/Inventory'
import { ShareButton } from '@components/Social/ShareButton'
import { HARVEST_META } from '@/services/harvest'
import { trackEvent } from '@/services/analytics'
import { showSuccess } from '@/utils/toast'
import { haptics } from '@/utils/haptics'
import { useAchievementStore, useResourceStore, type HarvestableResourceType } from '@/store'
import type { ResourceType } from '@/types/game'

function formatResource(resource: string): string {
  const meta = HARVEST_META[resource as HarvestableResourceType]
  if (meta) return meta.label

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

function formatHarvestTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function NebulaView() {
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const applyOptimisticHarvest = useResourceStore((state) => state.applyOptimisticHarvest)
  const confirmOptimisticUpdate = useResourceStore((state) => state.confirmOptimisticUpdate)
  const lastHarvest = useResourceStore((state) => state.lastHarvest)
  const harvested = useResourceStore((state) => state.harvested)
  const harvestLog = useResourceStore((state) => state.harvestLog)
  const stats = useAchievementStore((state) => state.stats)
  const hasHarvests = harvestLog.length > 0

  const handleHarvest = useCallback(
    (resourceType: ResourceType, amount: number, pointId?: string) => {
      const scanId = pointId ?? 'anomaly-scan'
      const { transactionId } = applyOptimisticHarvest(
        {
          resourceType: resourceType as HarvestableResourceType,
          amount,
          scanPointId: scanId,
          source: 'scan',
        },
        `Scan Anomaly: ${resourceType} +${amount}`
      )

      confirmOptimisticUpdate(transactionId)

      const label =
        HARVEST_META[resourceType as HarvestableResourceType]?.label ?? formatResource(resourceType)
      showSuccess(`Harvested ${amount} ${label}`)
      haptics.scanSuccess()
      trackEvent('harvest_completed', { resourceType, amount, pointId: scanId })
    },
    [applyOptimisticHarvest, confirmOptimisticUpdate]
  )

  return (
    <div className="nebula-view">
      <section className="page-panel nebula-view-meta">
        <p className="eyebrow">Nebula View</p>
        <h1>Survey active stellar clouds.</h1>
        <p className="page-copy">
          Review mapped sectors, anomaly density, and navigation conditions for upcoming
          expeditions. Click a glowing anomaly to scan it and harvest its resources.
          <span className="sr-only">
            Keyboard: Tab to select scan points, Enter to scan, arrow keys to navigate.
          </span>
          <span
            aria-hidden="true"
            style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.85 }}
          >
            ⌨️ Tip: Tab + Enter to scan • Arrow keys to orbit • Q/E to zoom
          </span>
        </p>

        <div className="home-hero-actions">
          <WalletDisplay onOpenConnectModal={() => setIsConnectOpen(true)} />
        </div>
      </section>

      <div className="nebula-view-canvas">
        <NebulaCanvas onScanComplete={handleHarvest} />
      </div>

      <div className="nebula-resource-grid">
        <section
          id="nebula-scan-results"
          className="panel-card nebula-scan-panel"
          aria-live="polite"
        >
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

      <section className="panel-card harvest-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Harvest Log</p>
            <h2>Scan payouts</h2>
          </div>
          <span className="section-meta">
            {hasHarvests
              ? `${harvestLog.length} recent harvest${harvestLog.length === 1 ? '' : 's'}`
              : 'No harvests yet'}
          </span>
        </div>

        <div className="metric-grid harvest-totals">
          {(Object.keys(HARVEST_META) as HarvestableResourceType[]).map((type) => (
            <article className="metric-card" key={type}>
              <span className="metric-label" style={{ color: HARVEST_META[type].color }}>
                {HARVEST_META[type].label}
              </span>
              <strong>{harvested[type]}</strong>
            </article>
          ))}
        </div>

        {!hasHarvests ? (
          <p className="page-copy">
            Nothing collected yet. Select an anomaly in the nebula above and scan it to harvest its
            resources.
          </p>
        ) : (
          <ul className="queue-list">
            {harvestLog.map((entry) => (
              <li key={entry.id} className="queue-item">
                <div>
                  <strong>{HARVEST_META[entry.resourceType].label}</strong>
                  <p>{formatHarvestTime(entry.createdAt)}</p>
                </div>
                <span>+{entry.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </div>
  )
}

export default NebulaView
