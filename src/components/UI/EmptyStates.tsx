import { EmptyState } from './EmptyState'
import type { EmptyStateAction } from './EmptyState'

interface PresetProps {
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  compact?: boolean
  className?: string
}

/** Empty state for the resource inventory. */
export function EmptyInventory({ action, secondaryAction, compact, className }: PresetProps) {
  return (
    <EmptyState
      icon="📦"
      title="Your cargo hold is empty"
      description="Scan nebulae and mine resources to start filling your inventory. Everything you collect shows up here."
      action={action ?? { label: 'Start scanning', href: '/nebula' }}
      secondaryAction={secondaryAction}
      compact={compact}
      className={className}
    />
  )
}

/** Empty state for transaction / activity history. */
export function EmptyTransactions({ action, secondaryAction, compact, className }: PresetProps) {
  return (
    <EmptyState
      icon="🪐"
      title="No transactions yet"
      description="Once you trade assets, upgrade your ship, or harvest resources, your on-chain activity will appear here."
      action={action}
      secondaryAction={secondaryAction}
      compact={compact}
      className={className}
    />
  )
}

/** Empty state for the achievements list. */
export function EmptyAchievements({ action, secondaryAction, compact, className }: PresetProps) {
  return (
    <EmptyState
      icon="🏆"
      title="No achievements unlocked"
      description="Complete scans, trades, and ship upgrades to earn achievements. Your progress will be tracked here."
      action={action ?? { label: 'Explore the galaxy', href: '/nebula' }}
      secondaryAction={secondaryAction}
      compact={compact}
      className={className}
    />
  )
}

/** Empty state for the marketplace / DEX. */
export function EmptyMarketplace({ action, secondaryAction, compact, className }: PresetProps) {
  return (
    <EmptyState
      icon="🛰️"
      title="No market activity"
      description="There are no open orders or trades for this pair right now. Be the first to place an order."
      action={action}
      secondaryAction={secondaryAction}
      compact={compact}
      className={className}
    />
  )
}
