import type { ReactNode } from 'react'

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

export interface EmptyStateProps {
  /** Large glyph/emoji or custom node shown above the title. */
  icon?: ReactNode
  title: string
  description?: ReactNode
  /** Primary call-to-action. */
  action?: EmptyStateAction
  /** Secondary, lower-emphasis call-to-action. */
  secondaryAction?: EmptyStateAction
  className?: string
  /** Tighter padding for use inside cards/panels. */
  compact?: boolean
}

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction
  variant: 'primary' | 'secondary'
}) {
  const base =
    variant === 'primary'
      ? 'bg-cosmic-violet text-white hover:bg-cosmic-purple'
      : 'border border-space-600 text-space-100 hover:bg-space-800'
  const className = `inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${base}`

  if (action.href) {
    return (
      <a href={action.href} className={className}>
        {action.label}
      </a>
    )
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  )
}

/**
 * Consistent empty-state block: icon, headline, supporting copy and up to two
 * CTAs. Announced politely so screen readers pick up when a list becomes empty.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center text-center ${
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14'
      }${className ? ` ${className}` : ''}`}
    >
      {icon != null && (
        <div className={compact ? 'text-3xl' : 'text-5xl'} aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {description != null && <p className="max-w-sm text-sm text-space-100">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {action && <ActionButton action={action} variant="primary" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
        </div>
      )}
    </div>
  )
}

export default EmptyState
