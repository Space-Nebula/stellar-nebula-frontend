import { useId } from 'react'
import type { ReactNode } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  /** Whether the modal is mounted/visible. */
  isOpen: boolean
  /** Called when the user dismisses the modal (ESC, backdrop, close button). */
  onClose: () => void
  /** Accessible title. Rendered in the header unless `hideHeader` is set. */
  title?: string
  /** Used for `aria-label` when no visible `title` is provided. */
  ariaLabel?: string
  children: ReactNode
  /** Optional footer content (actions). */
  footer?: ReactNode
  size?: ModalSize
  /** Close when the backdrop is clicked. Default: true. */
  closeOnBackdrop?: boolean
  /** Close when ESC is pressed. Default: true. */
  closeOnEsc?: boolean
  /** Hide the default header (title + close button). Default: false. */
  hideHeader?: boolean
  /** Hide the close (×) button in the header. Default: false. */
  hideCloseButton?: boolean
  className?: string
}

/**
 * Centralised, accessible modal primitive. Handles focus trapping, focus
 * restoration, body scroll lock, ESC + backdrop dismissal, and a consistent
 * enter animation (honours `prefers-reduced-motion` via CSS).
 *
 * Prefer opening modals through `useModal()` for centralised state; use this
 * component directly only when local `isOpen` state is genuinely simpler.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  ariaLabel,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  hideHeader = false,
  hideCloseButton = false,
  className,
}: ModalProps) {
  const titleId = useId()
  // Focus in, cycle, restore, and lock the page behind — the same contract every
  // dialog in the app owes the user, so it is one shared implementation.
  const panelRef = useFocusTrap<HTMLDivElement>({
    active: isOpen,
    onEscape: closeOnEsc ? onClose : undefined
  })

  if (!isOpen) return null

  const label = title ?? ariaLabel

  return (
    <div className="ui-modal-backdrop">
      {closeOnBackdrop && (
        <button
          type="button"
          className="ui-modal-backdrop-close"
          aria-label="Close dialog"
          tabIndex={-1}
          onClick={onClose}
        />
      )}
      <div
        ref={panelRef}
        className={`ui-modal-panel ui-modal-${size}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
      >
        {!hideHeader && (
          <div className="ui-modal-header">
            {title && (
              <h2 id={titleId} className="ui-modal-title">
                {title}
              </h2>
            )}
            {!hideCloseButton && (
              <button
                type="button"
                className="ui-modal-close"
                onClick={onClose}
                aria-label="Close dialog"
              >
                ×
              </button>
            )}
          </div>
        )}

        <div className="ui-modal-body">{children}</div>

        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export default Modal
