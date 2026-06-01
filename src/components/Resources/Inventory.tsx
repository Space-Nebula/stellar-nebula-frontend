import { useMemo, useState } from 'react'
import { useResourceStore, type ResourceInventory, type ResourceType } from '../../store'

type InventoryFilter = 'all' | 'stocked' | 'low' | 'empty'
type InventorySort = 'amount-desc' | 'amount-asc' | 'name'

interface ResourceMeta {
  label: string
  shortLabel: string
  description: string
  accent: string
}

const RESOURCE_META: Record<ResourceType, ResourceMeta> = {
  credits: {
    label: 'Credits',
    shortLabel: 'CR',
    description: 'Primary funding used for ship work, trade, and operational fees.',
    accent: 'linear-gradient(135deg, rgba(50, 214, 165, 0.95), rgba(46, 196, 182, 0.6))',
  },
  fuel: {
    label: 'Fuel',
    shortLabel: 'FU',
    description: 'Propellant reserves for long-range travel and maneuvers.',
    accent: 'linear-gradient(135deg, rgba(96, 165, 250, 0.95), rgba(59, 130, 246, 0.55))',
  },
  minerals: {
    label: 'Minerals',
    shortLabel: 'MI',
    description: 'Structural material used for ship upgrades and module fabrication.',
    accent: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.55))',
  },
  nebulaDust: {
    label: 'Nebula Dust',
    shortLabel: 'ND',
    description: 'Rare dust used for advanced calibration and experimental systems.',
    accent: 'linear-gradient(135deg, rgba(192, 132, 252, 0.95), rgba(139, 92, 246, 0.55))',
  },
}

const FILTERS: Array<{ label: string; value: InventoryFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Stocked', value: 'stocked' },
  { label: 'Low', value: 'low' },
  { label: 'Empty', value: 'empty' },
]

const SORTS: Array<{ label: string; value: InventorySort }> = [
  { label: 'Amount: High', value: 'amount-desc' },
  { label: 'Amount: Low', value: 'amount-asc' },
  { label: 'Name', value: 'name' },
]

interface InventoryProps {
  inventory?: ResourceInventory
  compact?: boolean
  title?: string
}

export function Inventory({ inventory: inventoryProp, compact = false, title = 'Resource Inventory' }: InventoryProps) {
  const storeInventory = useResourceStore((state) => state.inventory)
  const optimisticTransactions = useResourceStore((state) => state.optimisticTransactions)
  const inventory = inventoryProp ?? storeInventory
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [sortBy, setSortBy] = useState<InventorySort>('amount-desc')
  const pendingChanges = useMemo(
    () =>
      optimisticTransactions
        .filter((transaction) => transaction.status === 'pending')
        .reduce<Partial<Record<ResourceType, number>>>((changes, transaction) => {
          for (const [resource, delta] of Object.entries(transaction.changes) as Array<
            [ResourceType, number | undefined]
          >) {
            if (!delta) continue
            changes[resource] = (changes[resource] ?? 0) + delta
          }
          return changes
        }, {}),
    [optimisticTransactions]
  )

  const rows = useMemo(() => {
    const entries = Object.entries(inventory) as Array<[ResourceType, number]>

    const filtered = entries.filter(([, amount]) => {
      switch (filter) {
        case 'stocked':
          return amount > 0
        case 'low':
          return amount > 0 && amount < 100
        case 'empty':
          return amount === 0
        default:
          return true
      }
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount-asc':
          return a[1] - b[1]
        case 'name':
          return RESOURCE_META[a[0]].label.localeCompare(RESOURCE_META[b[0]].label)
        default:
          return b[1] - a[1]
      }
    })

    return filtered
  }, [filter, inventory, sortBy])

  const totalUnits = useMemo(
    () => rows.reduce((sum, [, amount]) => sum + amount, 0),
    [rows]
  )

  return (
    <section className={`inventory-panel ${compact ? 'inventory-panel-compact' : ''}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Resources</p>
          <h2>{title}</h2>
        </div>
        <div className="inventory-summary">
          <span>{rows.length} tracked</span>
          <span>{totalUnits} total units</span>
        </div>
      </div>

      <div className="inventory-toolbar" aria-label="Resource controls">
        <div className="segmented-control" role="group" aria-label="Filter resources">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? 'segmented-button is-active' : 'segmented-button'}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="sort-control">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as InventorySort)}>
            {SORTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="inventory-grid">
        {rows.map(([resource, amount]) => {
          const meta = RESOURCE_META[resource]
          const severity = amount === 0 ? 'empty' : amount < 100 ? 'low' : 'ready'
          const pendingDelta = pendingChanges[resource] ?? 0

          return (
            <article
              key={resource}
              className={`resource-card resource-card-${severity} ${pendingDelta ? 'resource-card-pending' : ''}`}
              title={`${meta.label}: ${meta.description}`}
            >
              <div className="resource-badge" style={{ background: meta.accent }}>
                {meta.shortLabel}
              </div>
              <div className="resource-body">
                <div className="resource-title-row">
                  <h3>{meta.label}</h3>
                  <span className="resource-amount">{amount}</span>
                </div>
                {pendingDelta !== 0 && (
                  <p className="resource-pending" aria-live="polite">
                    Pending {pendingDelta > 0 ? '+' : ''}
                    {pendingDelta}
                  </p>
                )}
                <p>{meta.description}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default Inventory
