import { useEffect, useRef, useCallback } from 'react'

interface TutorialHighlightProps {
  selector: string | null
  visible: boolean
}

export function TutorialHighlight({ selector, visible }: TutorialHighlightProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const highlightRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef(0)

  const createOverlay = useCallback(() => {
    if (!overlayRef.current) {
      const overlay = document.createElement('div')
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9998;
      `
      document.body.appendChild(overlay)
      overlayRef.current = overlay
    }
    return overlayRef.current
  }, [])

  const removeOverlay = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.remove()
      overlayRef.current = null
    }
    if (highlightRef.current) {
      highlightRef.current.remove()
      highlightRef.current = null
    }
  }, [])

  const updateHighlight = useCallback(() => {
    if (!selector || !visible) {
      removeOverlay()
      return
    }

    const el = document.querySelector(selector)
    if (!el) {
      removeOverlay()
      return
    }

    const overlay = createOverlay()
    const bounds = el.getBoundingClientRect()
    const padding = 8

    if (!highlightRef.current) {
      const highlight = document.createElement('div')
      highlight.style.cssText = `
        position: absolute;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
        border: 2px solid rgba(124, 58, 237, 0.8);
        transition: all 0.3s ease-out;
        pointer-events: none;
      `
      overlay.appendChild(highlight)
      highlightRef.current = highlight
    }

    highlightRef.current.style.top = `${bounds.top + window.scrollY - padding}px`
    highlightRef.current.style.left = `${bounds.left + window.scrollX - padding}px`
    highlightRef.current.style.width = `${bounds.width + padding * 2}px`
    highlightRef.current.style.height = `${bounds.height + padding * 2}px`
  }, [selector, visible, createOverlay, removeOverlay])

  useEffect(() => {
    updateHighlight()

    const handleUpdate = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateHighlight)
    }

    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
      removeOverlay()
    }
  }, [updateHighlight, removeOverlay])

  return null
}
