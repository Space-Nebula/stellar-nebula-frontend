import { useCallback, useState } from 'react'
import { NebulaCanvas } from '@components/Canvas'
import { ConnectModal, WalletDisplay } from '@components/Wallet'
import { HARVEST_META } from '@/services/harvest'
import { showSuccess } from '@/utils/toast'
import { trackEvent } from '@/services/analytics'
import { useResourceStore } from '@/store'
import type { HarvestableResourceType } from '@/store'
import type { ResourceType } from '@/types/game'

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
  const { harvested, harvestLog, addHarvest } = useResourceStore()

  const handleHarvest = useCallback(
    (resourceType: ResourceType, amount: number) => {
      const type = resourceType as HarvestableResourceType
      addHarvest(type, amount)
      showSuccess(`Harvested ${amount} ${HARVEST_META[type].label}`)
      trackEvent('harvest_completed', { resourceType: type, amount })
    },
    [addHarvest]
  )

  const hasHarvests = harvestLog.length > 0

  return (
    <div className="nebula-view">
      <section className="page-panel nebula-view-meta">
        <p className="eyebrow">Nebula View</p>
        <h1>Survey active stellar clouds.</h1>
        <p className="page-copy">
          Review mapped sectors, anomaly density, and navigation conditions for upcoming
          expeditions. Click a glowing anomaly to scan it and harvest its resources.
        </p>

        <div className="home-hero-actions">
          <WalletDisplay onOpenConnectModal={() => setIsConnectOpen(true)} />
        </div>
      </section>

      <div className="nebula-view-canvas">
        <NebulaCanvas onScanComplete={handleHarvest} />
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
