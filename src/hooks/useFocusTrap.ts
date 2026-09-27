import { useEffect, useRef } from 'react'

/**
 * Elements a keyboard user can reach, in DOM order.
 *
 * `[tabindex]:not([tabindex="-1"])` is last on purpose: an element with
 * `tabindex="0"` is reachable, one with `tabindex="-1"` is only reachable by
 * script, and neither is a tab stop we should offer the user.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface FocusTrapOptions {
  /** Whether the trap is active. Inactive leaves focus and listeners untouched. */
  active: boolean
  /**
   * Call ESC. Leave unset to let ESC fall through — a native `<dialog>` opened
   * with `showModal()` already dismisses itself, and handling it twice would
   * close the parent modal as well.
   */
  onEscape?: () => void
  /**
   * Keep the page behind from scrolling. Default: true. Turn it off when an
   * ancestor already locked the scroll, so the earlier value is what gets
   * restored rather than this hook's own.
   */
  lockScroll?: boolean
}

/**
 * Keeps keyboard focus inside a dialog: focus moves in on open, Tab and
 * Shift+Tab cycle within it, and focus returns to whatever was focused before on
 * close.
 *
 * The trap is deliberately a hook rather than a component so every dialog can
 * use it, including one that is not the shared `Modal` primitive. Three dialogs
 * each with their own copy of this logic is how they drift apart — one of them
 * was already missing the restore.
 *
 * Native `<dialog>` opened with `showModal()` gets the first two behaviours
 * from the platform; only the restore is worth adding there, and `active: false`
 * leaves that to the browser.
 */
export function useFocusTrap<T extends HTMLElement>(
  options: FocusTrapOptions
): React.RefObject<T | null> {
  const { active, onEscape, lockScroll = true } = options
  const containerRef = useRef<T>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    const { body } = document
    const previousOverflow = body.style.overflow
    if (lockScroll) body.style.overflow = 'hidden'

    /**
     * The controls a Tab keypress should actually be able to reach.
     *
     * `tabIndex >= 0` is the real test, and the CSS selector alone does not give
     * it: a `<button tabindex="-1">` still matches `button:not([disabled])`. The
     * invisible backdrop dismiss control in `Modal` is exactly such a button, so
     * a selector-only filter offers it to the user as the first tab stop and
     * focuses it on open — an invisible control that swallows the first Tab.
     */
    const isVisible = (el: HTMLElement): boolean => {
      if (el.hidden || el.closest('[hidden]')) return false
      if (el.getAttribute('aria-hidden') === 'true') return false
      // `offsetParent === null` is the usual test for "not rendered", but test
      // DOMs commonly leave it null for every element, which would empty the
      // list and make the trap inert exactly where it is tested. Prefer the
      // modern visibility check where it exists and assume visible otherwise:
      // offering a Tab stop to something that turned out to be hidden is a much
      // smaller failure than trapping focus nowhere.
      if (typeof el.checkVisibility === 'function') return el.checkVisibility()
      return true
    }

    const focusableElements = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.tabIndex >= 0 && (isVisible(el) || el === document.activeElement)
      )

    // Move focus in. The first focusable control is the useful target; with none,
    // the container itself so a screen reader announces the dialog at all.
    const first = focusableElements()[0]
    ;(first ?? container).focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscapeRef.current) {
        event.stopPropagation()
        onEscapeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = focusableElements()
      if (focusable.length === 0) {
        // Nothing to move to, so hold focus on the dialog rather than letting it
        // escape to the page behind.
        event.preventDefault()
        container.focus()
        return
      }

      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === firstEl || active === container)) {
        event.preventDefault()
        lastEl.focus()
      } else if (!event.shiftKey && active === lastEl) {
        event.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      if (lockScroll) body.style.overflow = previousOverflow
      // Restore only if something is still mounted to receive focus: a trigger
      // unmounted while the dialog was open would otherwise pull focus to
      // <body> and lose the user's place.
      const target = previouslyFocused.current
      if (target && target.isConnected) target.focus?.()
    }
  }, [active, lockScroll])

  return containerRef
}
