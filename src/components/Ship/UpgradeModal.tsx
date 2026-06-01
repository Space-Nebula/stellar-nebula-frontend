import { useEffect, useMemo, useState } from 'react'
import type { Ship, ShipStatus } from '../../store'
import { type ResourceInventory, type ResourceType } from '../../store'
import {
  buildBatchTransaction,
  createBatchOperation,
  createBatchTransactionBuilder,
  type BatchOperation,
} from '../../utils/stellar/batchTransaction'

type UpgradeId = 'cargo-expansion' | 'crew-quarters' | 'deep-scan-array'
type UpgradeOperationKind = 'inspect' | 'install' | 'calibrate' | 'certify'

export interface ShipUpgradeOption {
  id: UpgradeId
  name: string
  description: string
  cost: Partial<Record<ResourceType, number>>
  cargoDelta?: number
  crewDelta?: number
  statusAfter?: ShipStatus
  sectorLabel?: string
}

export const SHIP_UPGRADES: ShipUpgradeOption[] = [
  {
    id: 'cargo-expansion',
    name: 'Cargo Expansion',
    description: 'Expand the hold for longer runs and higher-volume trade.',
    cost: { credits: 1200, minerals: 45, fuel: 20 },
    cargoDelta: 120,
    statusAfter: 'docked',
    sectorLabel: 'Expansion Bay',
  },
  {
    id: 'crew-quarters',
    name: 'Crew Quarters',
    description: 'Add comfort modules and support systems for more specialists.',
    cost: { credits: 900, nebulaDust: 8, fuel: 10 },
    crewDelta: 4,
    statusAfter: 'docked',
    sectorLabel: 'Habitation Deck',
  },
  {
    id: 'deep-scan-array',
    name: 'Deep Scan Array',
    description: 'Install a precision array for long-range reconnaissance.',
    cost: { credits: 1600, minerals: 25, nebulaDust: 16 },
    cargoDelta: 30,
    crewDelta: 1,
    statusAfter: 'maintenance',
    sectorLabel: 'Survey Ring',
  },
]

const RESOURCE_ORDER: ResourceType[] = ['credits', 'fuel', 'minerals', 'nebulaDust']

function formatResourceName(resource: ResourceType): string {
  switch (resource) {
    case 'nebulaDust':
      return 'Nebula Dust'
    default:
      return resource[0].toUpperCase() + resource.slice(1)
  }
}

function getUpgradeOperations(
  ship: Ship | null,
  upgrade: ShipUpgradeOption
): readonly BatchOperation<UpgradeOperationKind, Record<string, unknown>>[] {
  const shipId = ship?.id ?? 'unknown'

  const builder = createBatchTransactionBuilder<BatchOperation<UpgradeOperationKind, Record<string, unknown>>>({
    baseFeeStroops: 100,
    maxOperations: 5,
  })

  const inspect = createBatchOperation({
    id: `${upgrade.id}-inspect`,
    kind: 'inspect',
    description: `Inspect ${ship?.name ?? 'selected ship'} before applying ${upgrade.name}`,
    payload: { shipId, upgradeId: upgrade.id },
    feeStroops: 25,
  })

  const install = createBatchOperation({
    id: `${upgrade.id}-install`,
    kind: 'install',
    description: `Install modules for ${upgrade.name}`,
    payload: { shipId, upgradeId: upgrade.id },
    dependsOn: [inspect.id],
    feeStroops: 40,
  })

  const calibrate = createBatchOperation({
    id: `${upgrade.id}-calibrate`,
    kind: 'calibrate',
    description: `Calibrate systems after ${upgrade.name}`,
    payload: { shipId, upgradeId: upgrade.id },
    dependsOn: [install.id],
    feeStroops: 35,
  })

  const certify = createBatchOperation({
    id: `${upgrade.id}-certify`,
    kind: 'certify',
    description: `Certify ${upgrade.name} for active service`,
    payload: { shipId, upgradeId: upgrade.id },
    dependsOn: [calibrate.id],
    feeStroops: 20,
  })

  return builder.replaceOperations([inspect, install, calibrate, certify]).build().operations
}

function hasEnoughResources(inventory: ResourceInventory, cost: Partial<Record<ResourceType, number>>): boolean {
  return RESOURCE_ORDER.every((resource) => (cost[resource] ?? 0) <= inventory[resource])
}

interface UpgradeModalProps {
  isOpen: boolean
  ship: Ship | null
  inventory: ResourceInventory
  isPending?: boolean
  onClose: () => void
  onConfirm: (upgrade: ShipUpgradeOption) => void | Promise<void>
}

export function UpgradeModal({ isOpen, ship, inventory, isPending = false, onClose, onConfirm }: UpgradeModalProps) {
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<UpgradeId>(SHIP_UPGRADES[0].id)

  useEffect(() => {
    if (isOpen) {
      setSelectedUpgradeId(SHIP_UPGRADES[0].id)
    }
  }, [isOpen, ship?.id])

  const selectedUpgrade = useMemo(
    () => SHIP_UPGRADES.find((option) => option.id === selectedUpgradeId) ?? SHIP_UPGRADES[0],
    [selectedUpgradeId]
  )

  const operations = useMemo(
    () => getUpgradeOperations(ship, selectedUpgrade),
    [selectedUpgrade, ship]
  )

  const plan = useMemo(() => buildBatchTransaction(operations), [operations])
  const canAfford = hasEnoughResources(inventory, selectedUpgrade.cost)
  const disabled = !ship || !canAfford || isPending

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Ship Upgrades</p>
            <h2 id="upgrade-modal-title">Upgrade {ship?.name ?? 'your ship'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close upgrade modal">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="upgrade-picker">
            {SHIP_UPGRADES.map((upgrade) => {
              const isSelected = upgrade.id === selectedUpgrade.id
              const affordable = hasEnoughResources(inventory, upgrade.cost)

              return (
                <button
                  key={upgrade.id}
                  type="button"
                  className={isSelected ? 'upgrade-choice is-selected' : 'upgrade-choice'}
                  onClick={() => setSelectedUpgradeId(upgrade.id)}
                >
                  <strong>{upgrade.name}</strong>
                  <span>{affordable ? 'Available' : 'Insufficient resources'}</span>
                </button>
              )
            })}
          </div>

          <div className="upgrade-details">
            <div className="detail-card">
              <p className="detail-label">Description</p>
              <p>{selectedUpgrade.description}</p>
            </div>

            <div className="detail-grid">
              <div className="detail-card">
                <p className="detail-label">Cost</p>
                <ul className="detail-list">
                  {RESOURCE_ORDER.map((resource) => {
                    const amount = selectedUpgrade.cost[resource] ?? 0
                    if (!amount) return null
                    return (
                      <li key={resource}>
                        <span>{formatResourceName(resource)}</span>
                        <strong>{amount}</strong>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="detail-card">
                <p className="detail-label">Before / After</p>
                <ul className="detail-list">
                  <li>
                    <span>Cargo capacity</span>
                    <strong>
                      {ship?.cargoCapacity ?? 0} → {(ship?.cargoCapacity ?? 0) + (selectedUpgrade.cargoDelta ?? 0)}
                    </strong>
                  </li>
                  <li>
                    <span>Crew capacity</span>
                    <strong>
                      {ship?.crewCapacity ?? 0} → {(ship?.crewCapacity ?? 0) + (selectedUpgrade.crewDelta ?? 0)}
                    </strong>
                  </li>
                  <li>
                    <span>Next status</span>
                    <strong>{selectedUpgrade.statusAfter ?? ship?.status ?? 'docked'}</strong>
                  </li>
                </ul>
              </div>
            </div>

            <div className="detail-card">
              <p className="detail-label">Batch plan</p>
              <p className="detail-copy">
                {plan.totalOperations} ordered operations, {plan.totalFeeStroops} stroops total fee.
              </p>
              {isPending && (
                <p className="detail-pending" role="status">
                  Upgrade transaction pending confirmation.
                </p>
              )}
              {!plan.isValid && (
                <p className="detail-error">{plan.errors[0]?.message ?? 'Batch plan failed validation.'}</p>
              )}
              <ol className="operation-list">
                {plan.operations.map((operation) => (
                  <li key={operation.id}>
                    <span>{operation.kind}</span>
                    <small>{operation.description}</small>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onConfirm(selectedUpgrade)}
            disabled={disabled}
          >
            {isPending ? 'Confirming...' : disabled ? 'Resources unavailable' : 'Apply upgrade'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal
