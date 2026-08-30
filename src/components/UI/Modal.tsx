import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

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

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

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
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Keep callbacks fresh without re-running the main effect.
  const onCloseRef = useRef(onClose)
  const closeOnEscRef = useRef(closeOnEsc)
  useEffect(() => {
    onCloseRef.current = onClose
    closeOnEscRef.current = closeOnEsc
  })

  useEffect(() => {
    if (!isOpen) return

    const panel = panelRef.current
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    // Focus the first focusable element, falling back to the panel itself.
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    ;(firstFocusable ?? panel)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscRef.current) {
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !panel) return

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )

      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      body.style.overflow = previousOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [isOpen])

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
