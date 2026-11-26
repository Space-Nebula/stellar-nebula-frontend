import { memo } from 'react'
import type { Ship } from '../../store'

interface ShipCardProps {
  ship: Ship
  active: boolean
  onSelect: (shipId: string) => void
}

function ShipCardComponent({ ship, active, onSelect }: ShipCardProps) {
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

export const ShipCard = memo(ShipCardComponent)
